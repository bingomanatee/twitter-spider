var Mongoose_Model = require('hive-model-mongoose');
var async = require('async');
var _ = require('underscore');
var util = require('util');

module.exports = function (apiary, callback) {

    var model = new Mongoose_Model({
            name: 'twitter_user',

            /**
             * looks up users from Twitter and adds them to the mongoose database
             * note - this method assumes you have checked the rate limit gate...
             * @param params {Object}
             * @param callback {function}
             */
            get_users_from_twitter: function (params, callback) {
                var self = this;
                var data = this.serialize_params(params);

                this.find_users(params, 'screen_name,id', function (err, old_users) {

                    if (old_users && old_users.length) {
                        old_users = _.reject(old_users, function (user) {
                            return _.contains(['queued', 'fetching'], user.load_status)
                        });

                        console.log('reomving users from fetch quue: %s', util.inspect(old_users));
                        data = self.remove_users_from_data(old_users, data);
                    }

                    console.log('getting users from twitter: %s', util.inspect(data));

                    var q = {include_entities: false};
                    items = self.deserialize_params(data);

                    if (items.screen_name && items.screen_name.length) {
                        q.screen_name = items.screen_name.slice(0, 100).join(',');
                    } else {
                        q.user_id = items.id.slice(0, 100).join(',');
                    }

                    console.log('data: %s, query: %s', util.inspect(items), util.inspect(q));

                    var twitter = apiary.model('twitter_conn');
                    twitter.get('/users/lookup', q, function (err, new_users) {
                        if (err) {
                            console.log('error looking up users: %s', err);
                            console.log('authentication: %s', require('util').inspect(twitter.auth));
                            return callback(err);
                        }
                        console.log('new users: %s', util.inspect(new_users));
                        twitter.dec_count('users', '/users/lookup');

                        if (new_users && new_users.length) {
                            _.each(new_users, function (user) {
                                user.load_status = 'loaded';
                            });

                            var q_parms = {
                                id:          _.pluck(new_users, 'id'),
                                screen_name: _.pluck(new_users, 'screen_nae')
                            };

                            self.find(q_parms, function (err, old_users) {
                                var unsaved_users = [];

                                new_users.forEach(function (new_user) {
                                    var old_user = _.find(old_users, function (old_user) {
                                        if (new_user.screen_name) {
                                            return old_user.screen_name == new_user.screen_name;
                                        } else if (new_user.id) {
                                            return old_user.id == new_user.id;
                                        }
                                    });

                                    if (old_user) {
                                        _.extend(old_user, new_user);
                                        old_user.save();
                                    } else {
                                        unsaved_users.push(new_user);
                                    }
                                });

                                if (unsaved_users.length) {
                                    self.add(unsaved_users, function () {
                                        self.find_users(params, callback);
                                    });
                                } else {
                                    self.find_users(params, callback);
                                }
                            })

                        }
                    });
                })
            },

            user_query: function (params) {
                var data = this.serialize_params(params);
                var screen_names = _.pluck(_.where(data, {type: 'screen_name'}), 'value');
                var user_ids = _.pluck(_.where(data, {type: 'id'}), 'value');

                var query = {'$or': []};

                if (screen_names.length) {
                    query['$or'].push({'screen_name': {'$in': screen_names}});
                }
                if (user_ids.length) {
                    query['$or'].push({id: {'$in': user_ids}});
                }
            },

            find_users: function (params, options, callback) {
                if (!(params.screen_name || params.id)) {
                    return  callback(new Error('must provide screen name or user id'))
                }

                var query = this.user_query(params);

                this.find(query, options, callback);
            },

            /**
             * this function fetches all existing users from mongoose
             * and adds a placeholder for any users in the params
             * not in mongoose already
             *
             * @param params
             * @param callback
             */
            fetch: function (params, callback) {
                var self = this;
                var twitter_conn = apiary.model('twitter_conn');
                var data = self.serialize_params(params);

                this.find_users(params, function (err, users) {
                    if (users && users.length) {

                        data = self.remove_users_from_data(users, data);

                        if (data.length) {
                            self.queue_users(data, function (err, queued) {
                                callback(null, users.concat(queued));
                            })
                        } else {
                            callback(null, users);
                        }
                    } else {
                        self.queue_users(data, callback);
                    }
                });

            },

            _serialize: function (type, params) {
                if (params[type]) {
                    if (_.isArray(params[type])) {
                        return params[type].map(function (name) {
                            return {type: type, value: name}
                        });
                    } else {
                        return [
                            {type: type, value: params[type]}
                        ];
                    }
                } else {
                    return [];
                }
            },

            queue_users: function (data, callback) {
                var users = data.map(function (item) {
                    return item.type == 'id' ? {
                        id:          item.value,
                        load_status: 'queued'
                    } : {
                        screen_name: item.value,
                        load_status: 'queued'
                    };
                });

                this.add(users, callback);
            },

            deserialize_params: function (data) {
                return data.reduce(function (out, item) {
                    if (!out[item.type]) {
                        out[item.type] = [];
                    }
                    out[item.type].push(item.value);
                    return out;
                }, {id: [], screen_name: []})
            },

            serialize_params: function (params) {
                var data = [];
                data = data.concat(this._serialize('screen_name', params));
                data = data.concat(this._serialize('id', params));
                return data;
            },

            remove_users_from_data: function (users, data) {
                var found_user_ids = _.pluck(users, 'id');
                var found_screen_names = _.pluck(users, 'screen_name');

                var out = _.reject(data, function (item) {
                    var o2 = true;
                    if (item.type == 'screen_name') {
                        o2 = _.contains(found_screen_names, item.value);
                    } else {
                        o2 = _.contains(found_user_ids, item.value);
                    }
                    return o2;
                });
                return out;
            }
        },
        {
            mongoose: apiary.get_config('mongoose'), schema_def: require('./schema/twitter_user.json')
        },
        apiary.dataspace,
        callback
    );

};
