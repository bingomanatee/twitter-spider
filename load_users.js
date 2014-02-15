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

mongoose.connect('mongodb://localhost/twittergraph');
var apiary = mvc.Apiary({mongoose: mongoose, frame_filter: ['twittergraph'],
    log_file:                      log_file, action_handler_failsafe_time: 3000}, frame_path);
apiary._config.setAll(require('./site_identity.json'));
apiary._config.setAll(require('./passport_config.json'));

var running = false;

apiary.init(function () {
    var twitter_user_model = apiary.model('twitter_user');

    var twitter_model = apiary.model('twitter_conn');

    twitter_user_model.count(function(err, count){
        if (count < 1){
            twitter_user_model.get_users_from_twitter({screen_name: 'david_edelhart'});
        }

    })

    setInterval(function () {
         if (running) return;
        running = true;
        twitter_user_model.count({load_status: 'queued'}, function (err, count) {
            console.log('queued: %s', count);
            if (count < 1) {
                running = false;
                return;
            }

            twitter_user_model.find({load_status: 'queued'}, 'screen_name', function (err, users) {
                if (err || (!users && users.length)) {
                    running = false;
                    return;
                }

                twitter_model.get_rate_limit('users,application', function (err, data) {
                    console.log('user rate limit: %s,  %s', err, util.inspect(data, {depth: 5}));
                    if (err) {
                        running = false;
                        return;
                    }

                    _.each(users, function (user) {
                        user.load_status = 'fetching';
                        user.fetch_time = new Date().getTime();
                        user.save();
                    });

                    if (data.resources.users['/users/lookup'].remaining > 2) {
                        twitter_user_model.get_users_from_twitter({screen_name: _.pluck(users, 'screen_name')},
                            function (err, users) {
                                running = false;
                                if (users) {
                                    console.log('found %s users', users.length);
                                } else {
                                    console.log('found no users');
                                }
                            });
                    } else {
                        running = false;
                    }
                })
            });
        })

    }, 500);
});