var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Mongoose_Model = require('hive-model-mongoose');
var async = require('async');
var bignum = require('bignum');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: Get the record of tweets
 */

var tweets_schema = require('./schema/tweets.json');

/* -------------- EXPORT --------------- */

var model;

function _mention_count(tweet) {
    if (tweet && tweet.entities && tweet.entities.mentions) {
        return  tweet.entities.mentions.length
    } else {
        return 0;
    }
}

module.exports = function (apiary, cb) {

    if (model) {
        return cb(null, model);
    }

    var mongoose = apiary.get_config('mongoose');

    Mongoose_Model(
        {
            name: 'twitter_user_tweets',

            add_many: function (tweets, callback) {
                var self = this;
                this.add(tweets, function (err, res) {
                    if (err) {
                        if (tweets.length > 20) {
                            var b = Math.floor(tweets.length / 2);
                            var tweets2 = tweets.slice(b);
                            self.add_many(tweets.slice(0, b), function () {
                                self.add_many(tweets2, callback);
                            });
                        } else {
                            _.each(tweets, function (t) {
                                self.put(t);
                            });
                            if (callback) {
                                callback();
                            }
                        }

                    } else if (callback) {
                        callback(err, res);
                    }
                })
            },

            user_query: function (params) {
                var q = {};
                if (params.id) {
                    q['user.id'] = params.id;
                } else if (params.screen_name) {
                    q['user.screen_name'] = params.screen_name;
                } else if (params['user.screen_name']) {
                    q['user.screen_name'] = params['user.screen_name'];
                } else if (params['user.id']) {
                    q['user.id'] = params['user.id'];
                } else {
                    console.log(' ~~~~~~~ bad query: %s', util.inspect(params));
                    return false;
                }
                return q;
            },

            /**
             * this is the last tweet in our database.
             * @param params
             * @param callback
             * @returns {*}
             */
            last_recorded_tweet: function (params, callback) {
                var self = this;
                var q = this.user_query(params);
                if (!q) {
                    return callback(new Error('bad query'));
                }

                this.find(q, '_id,created_at').sort('created_at').exec(function (err, results) {
                    if (err) {
                        return callback(err);
                    }

                    if (!results || (!results.length)) {
                        return callback(err, null);
                    }

                    var last_by_id = _.reduce(results, function (last, item) {
                        if (!last) {
                            return item;
                        }

                        var last_id = bignum(last._id);
                        var item_id = bignum(item._id);

                        if (item_id.cmp(last_id) > 0) {
                            return item;
                        } else {
                            return last;
                        }

                    }, null);

                    self.get(last_by_id._id, callback);

                });
            },

            _first_of_set: function (results) {
                return _.reduce(results, function (first, item) {
                    if (!first) {
                        return item;
                    }

                    var first_id = bignum(first.id_str || first._id);
                    var item_id = bignum(item.id_str || first._id);
                    return item_id.cmp(first_id) < 0 ? item : first;
                }, null)
            },

            _last_of_set: function (results) {
                return _.reduce(results, function (first, item) {
                    if (!first) {
                        return item;
                    }
                    var first_id = bignum(first.id_str);
                    var item_id = bignum(item.id_str);
                    return item_id.cmp(first_id) > 0 ? item : first;
                }, null)
            },

            first_recorded_tweet: function (params, callback) {
                var self = this;
                var q = this.user_query(params);
                if (!q) {
                    return callback(new Error('bad query'));
                }
                this.find(q, '_id,created_at').sort('created_at').exec(function (err, results) {
                    if (err || !results || (!results.length)) {
                        return callback(err, null);
                    }

                    var first_by_id = self._first_of_set(results);
                    self.get(first_by_id._id, callback);
                });
            },

            tweet_count: function (params, callback) {

                var q = this.user_query(params);

                if (!q) {
                    return callback(new Error('bad query'));
                }
                if (q.count) {
                    delete q.count;
                }

                this.count(q).exec(function (err, count) {
                    callback(err, count);
                });
            },

            _tweets: function (params, callback) {
                var twitter = apiary.model('twitter_conn');
                var self = this;

                if (!params.max_count) {
                    params.max_count = 200;
                }

                twitter.get_tweets(params, function (err, tweets) {
                    // stop on error, or no tweets found with params (possibly because of max_id)

                    if (err || (!tweets) || (!tweets.length)) {
                        if (err) {
                            console.log('----- error getting tweets %s (query %s) ------', err, util.inspect(params));
                        }
                        return callback(err, tweets);
                    }

                    _.each(tweets, function (tweet) {
                        tweet._id = tweet.id_str;
                        tweet.mentions = _mention_count(tweet);
                    });

                    self.add_many(tweets, function (err) {
                        if (err) {
                            return callback(err);
                        }

                        self.tweet_count(params, function (err, count) {
                            if (err || (count >= params.max_count)) {
                                callback(err);
                            } else {
                                self.first_recorded_tweet(params, function (err, tweet) {
                                    if (tweet) {
                                        var p = _.defaults({max_id: tweet._id}, params);
                                        self._tweets(p, callback);
                                    } else {
                                        callback(null, count);
                                    }
                                });
                            }
                        });
                    });
                });
            },

            _tweets_since: function (params, max_id, callback) {
                var p = _.extend({max_id: max_id}, params);

                this._tweets(p, callback);
            },

            /**
             * presumes you have checked rate limiting
             * @param params {Object}
             * @param last_tweet_id {int}
             * @param callback {function}
             */
            get_tweets: function (params, last_tweet_id, callback) {
                var self = this;
                if (_.isFunction(last_tweet_id)) {
                    callback = last_tweet_id;
                    last_tweet_id = null;
                }

                if (!last_tweet_id) {
                    this.last_recorded_tweet(params, function (err, last_tweet) {
                        if (err) {
                            callback(err);
                        } else if (last_tweet) {
                            self._tweets_since(params, last_tweet.id, callback);
                        } else {
                            self._tweets(params, callback);
                        }
                    })
                } else {
                    this._tweets_since(params, last_tweet_id, callback);
                }

            }
        }
        , {
            mongoose:   mongoose,
            schema_def: tweets_schema
        },
        apiary.dataspace,
        function (err, member_model) {
            model = member_model;
            cb(null, model);
        });

};