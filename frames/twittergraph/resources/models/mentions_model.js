var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Mongoose_Model = require('hive-model-mongoose');
var async = require('async');
var bignum = require('bignum');
var Gate = require('gate');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: tack mentions of users onto their mentions colletion
 */

// map function
var map = function () {
    if (this.entities && this.entities.user_mentions && this.entities.user_mentions.length) {
        var length = this.entities.user_mentions.length;
        for (var i = 0; i < length; ++i) {
            var mention = this.entities.user_mentions[i];
            var count = {};
            count[this.user.screen_name] = 1;
            emit(mention.screen_name, {tweets: [this._id], count: count })
        }
    }
};

// reduce function
var reduce = function (key, data) {
    var out = {tweets: [], count: {} };

    for (var i = 0; i < data.length; ++i) {
        var d = data[i];
        out.tweets = out.tweets.concat(d.tweets);
        for (var user in d.count) {
            if (out.count.hasOwnProperty(user)) {
                out.count[user] += d.count[user];
            } else {
                out.count[user] = d.count[user];
            }
        }
    }

    return out;
};

var tweets_schema = require('./schema/mentions.json');

/* -------------- EXPORT --------------- */

var model;

module.exports = function (apiary, cb) {
    if (model) {
        return cb(null, model);
    }

    var mongoose = apiary.get_config('mongoose');

    Mongoose_Model({
            name: 'tweet_mentions',

            write_to_users: function (callback) {
                var twitter_user_model = apiary.model('twitter_user');
                var gate = Gate.create();
                var self = this;

                this.find({}, '_id', function (err, mentions) {
                    var names = _.pluck(mentions, '_id');
                    twitter_user_model.fetch({screen_name: names}, function () {
                        self.all().stream().on('data',function (mention) {
                            var count = mention._doc.value.count;
                            twitter_user_model.model.update({screen_name: mention._id},
                                {
                                    mentions: _.map(count, function (c, name) {
                                        return {screen_name: name, count: c};
                                    })
                                }, gate.latch())
                        }).on('close', function () {
                                gate.await(callback);
                            });
                    })
                })
            },

            aggregate: function (callback) {
                var self = this;

// condition
                var query = {'entities': {'user_mentions': {
                    1: {
                        '$size': 1
                    }
                }
                }}; // @TODO: mark polled tweets

// map-reduce command
                var command = {
                    mapreduce: "twitter_user_tweets", // the name of the collection we are map-reducing
                    map:       map.toString(), // a function for mapping
                    reduce:    reduce.toString(), // a function  for reducing
                    //   query:     query, // filter conditions
                    //  sort: {field_3: 1}, // sorting on field_3 (also makes the reducing process faster)
                    out:       'tweet_mentions' // @TODO: amend new data when old polls are flushed
                };

// execute map-reduce command
                mongoose.connection.db.executeDbCommand(command, function () {
                    self.write_to_users(callback);
                });
            }
        },
        {
            mongoose:   mongoose,
            schema_def: tweets_schema
        },
        apiary.dataspace,
        function (err, member_model) {
            model = member_model;
            cb(null, model);
        }
    );

};