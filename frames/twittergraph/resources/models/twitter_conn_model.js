var Twitter = require('twit');
var _ = require('underscore');
var util = require('util');

module.exports = function (apiary, callback) {

    var config = {};

    var key = {
        "consumer_key":        "twitter_consumer_key",
        "consumer_secret":     "twitter_consumer_secret",
        "access_token":        "twitter_access_token",
        "access_token_secret": "twitter_access_token_secret"
    };

    _.each(key, function (alias, key) {
        config[key] = apiary.get_config(alias);
    });

    var twitter = new Twitter(config);
    twitter.getAuth();

    var last_rate_limit_poll = false;
    var poll_date = false;

    var MAX_POLL_AGE = 15 * 1000; // 15 seconds

    function poll_age() {
        if (!poll_date) {
            return -1;
        }

        return poll_date.getTime() - new Date().getTime();
    }

    var query_buffers = {};

    _.extend(twitter, {

        dec_count: function (which, url) {
            if (last_rate_limit_poll && last_rate_limit_poll.resources[which]) {
                var record = last_rate_limit_poll.resources[which][url];
                if (record) {
                    record.remaining--;
                }
            }
        },

        get_tweets: function (params, callback) {
            var q = {
                count: 200
            };
            if (params.max_count) {
                q.count = params.max_count;
            }
            if (params.max_id) {
                q.max_id = params.max_id;
            }

            if (params.screen_name) {
                q.screen_name = params.screen_name;
            } else if (params['user.screen_name']) {
                q.screen_name = params['user.screen_name'];
            } else if (params.user_id) {
                q.user_id = params.user_id;
            } else if (params['user.id']) {
                q.user_id = params['user.id']
            }

            twitter.get('/statuses/user_timeline', q, function (err, tweets) {
                callback(err, tweets);
            });
        },

        get_rate_limit: function (res, callback) {

            // don't make the limit call if the last poll says we are out of rate limit calls

            if (poll_age() > MAX_POLL_AGE) {
                last_rate_limit_poll = null;
            }

            if (last_rate_limit_poll) {
                if (last_rate_limit_poll.resources.application.remaining < 1) {
                    if (last_rate_limit_poll.resources.application.reset > new Date().getTime() / 1000) {
                        return callback(new Error('Cannot get rate limit'))
                    }
                }
            }
            if (_.isString(res)) {
                res = res.split(',');
            }
            res.push('application');
            res = _.sortBy(_.uniq(res), _.identity);
            res = res.join(',');

            if (query_buffers[res] && query_buffers[res].length) {
                console.log('not re-calling %s', res);
                // already have an identical query out;
                // use the same answer for this callback and preempt call
                return query_buffers[res].push(callback);
            } else {
                console.log('queueing first request for %s', res);
                query_buffers[res] = [callback];
            }

            twitter.get('/application/rate_limit_status', {resources: res}, function (err, data) {
                if (err) {
                    return callback(err);
                }

                if (last_rate_limit_poll) {
                    _.extend(last_rate_limit_poll.resources, data.resources);
                } else {
                    last_rate_limit_poll = data;
                    poll_date = new Date();
                }

                _.each(query_buffers[res], function (cb) {
                    cb(err, data);
                });

                delete query_buffers[res];
            });
        }

    });

    twitter.name = 'twitter_conn';

    callback(null, twitter);
}