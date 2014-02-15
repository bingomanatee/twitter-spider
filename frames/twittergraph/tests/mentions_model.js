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
    var tweets_model = apiary.model('twitter_user_tweets');
    var mentions_model = apiary.model('tweet_mentions');
    var tweet_user_model = apiary.model('twitter_user');

    tap.test('mentions', function (test) {

        function _make_tweet_mention(a, b) {
            return {
                _id:      ((Math.random() + '').replace(/\./, '')),
                entities: {
                    user_mentions: [
                        {name: b, screen_name: b}

                    ]},
                user:     {
                    screen_name: a
                }

            }
        }

        test.test('aggregate mentions', function (atest) {
            _.each([
                ['bob', 'sue'],
                ['sue', 'dan'],
                ['bob', 'dan'],
                ['bob', 'sue'],
                ['sue', 'dan']
            ], function (pair) {
                tweets_model.put(_make_tweet_mention.apply(this, pair));
            });

            setTimeout(function () {

                mentions_model.aggregate(function () {
                    mentions_model.write_to_users(function () {
                        tweet_user_model.all(function (err, users) {
                            function _j(u){ return u.toJSON()}
                            users = users.map(_j);
                            users = _.groupBy(users, 'screen_name');

                            var sue_mentions = _.groupBy(users.sue[0].mentions, 'screen_name');
                            var dan_mentions = _.groupBy(users.dan[0].mentions, 'screen_name');

                            atest.equal(sue_mentions.bob[0].count, 2, 'sue mentioned by bob twice');
                            atest.equal(dan_mentions.bob[0].count, 1, 'don mentioned by bob once');
                            atest.equal(dan_mentions.sue[0].count, 2, 'don mentioned by sue twice');


                            atest.end();
                        })
                    });
                });

            }, 500);
        });

        test.on('end', function () {
            return;
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
})
;