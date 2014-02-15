/**
 * Module dependencies.
 */

var path = require('path')
    , util = require('util')
    , mongoose = require('mongoose')
    , _ = require('underscore')
    , mvc = require('hive-mvc');

var log_file = path.resolve(__dirname, 'actions.log');
var frame_path = path.resolve(__dirname, 'frames');

var child = require('child_process').fork('mentions_to_users.js');



mongoose.connect('mongodb://localhost/twittergraph');
var apiary = mvc.Apiary({mongoose: mongoose, frame_filter: ['twittergraph'],
    log_file:                      log_file, action_handler_failsafe_time: 3000}, frame_path);
apiary._config.setAll(require('./site_identity.json'));
apiary._config.setAll(require('./passport_config.json'));

var running = false;

apiary.init(function () {
    var twitter_user_model = apiary.model('twitter_user');
    var tweets_model = apiary.model('twitter_user_tweets');
    var twitter_model = apiary.model('twitter_conn');
    setInterval(function () {
        if (running) {
            return;
        }
        running = true;
        twitter_user_model.find_one({tweets_fetched: 0}, 'screen_name',
            function (err, user) {
                if (!user) {
                    running = false;
                    return;
                }

                twitter_model.get_rate_limit('statuses', function (err, data) {
                    if (err) {
                        running = false;
                        return;
                    }
                    console.log('status rate limit: %s,  %s', err, util.inspect(data, {depth: 5}));

                    if (data.resources.statuses['/statuses/user_timeline'].remaining > 2) {
                        tweets_model.get_tweets({
                            screen_name: user.screen_name
                        }, function () {
                            tweets_model.tweet_count(user, function (err, count) {
                                console.log('%s tweets found for %s', count, user.screen_name);
                                user.tweets_fetched = count;
                                user.fetch_time = new Date();
                                user.save();
                                running = false;
                                child.send('get mentions');
                            });
                        })
                    } else {
                        console.log('rate limit - not getting tweets');
                        running = false;
                    }
                })
            });

    }, 500);
});