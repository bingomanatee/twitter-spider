var mongoose = require('mongoose');
var mvc = require('hive-mvc');
var tap = require('tap');
var _ = require('underscore');
var util = require('util');
var path = require('path');
var dbname = 'test_db_' + Math.round(10000 * Math.random());
mongoose.connect('mongodb://localhost/' + dbname);
var apiary = mvc.Apiary(_.extend({mongoose: mongoose, frame_filter: ['twittergraph']}, require('./../../../passport_config.json')),
    path.resolve(__dirname, '../../../frames')
);

console.log('db ------- %s -------- ', dbname);

apiary.init(function () {
    var tweet_model = apiary.model('twitter_user_tweets');

    tap.test('tweets', function (test) {
        test.test('fetch tweets', function (ftest) {

            function p() {
                return {screen_name: 'david_edelhart'};
            }

            tweet_model.tweet_count(p(), function (err, c) {
                ftest.equal(c, 0, 'start with no tweets');
                tweet_model.get_tweets({screen_name: 'david_edelhart', max_count: 50}, function (err, count) {

                    console.log('err: %s, tweet: %s', err, count);

                    tweet_model.tweet_count(p(), function (err, c) {
                        ftest.ok(c >= 50, 'end with at least 50 tweets');
                        ftest.end();
                    })
                })
            })
        });

        test.test('long poll', function (ltest) {

            function s(d) {
                return _.extend({'user.screen_name': 'AdamSessler'}, d);
            };

            tweet_model.tweet_count(s(), function (err, count) {

                ltest.equal(count, 0, 'no adam records');

                tweet_model.get_tweets(s({max_count: 400}), function (err) {
                    if (err) {
                        console.log('---- error %s', err);
                    }

                    setTimeout(function () {

                        tweet_model.tweet_count(s(), function (err, count) {
                            ltest.ok(count >= 200, 'over 200 adam records');

                            ltest.end();
                        });

                    }, 500);

                });
            })
        }),

            test.on('end', function () {
                console.log('disconnecting mongosose');
                var conn = _.where(mongoose.connections, {name: dbname})[0];

                if (conn) {
                    conn.db.dropDatabase(function () {
                        mongoose.disconnect();
                    });
                } else {
                    mongoose.disconnect();
                }
            });

        test.end();
    })
    ;

})
;