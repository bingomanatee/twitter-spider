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
apiary._config.setAll(require('./passport_config.json'));

var running = false;
var run = false;
var tweet_mentions_model;
var pending_run = false;

function get_mentions(from_parent) {
    if (running) {
        run = true;
        return;
    }

    if (pending_run) {
        pending_run = false;
    }

    running = true;

    tweet_mentions_model.aggregate(function () {
        running = false;
        if (run && (!pending_run)){
            pending_run = setTimeout(get_mentions, 5000);
        }
    })
}

apiary.init(function () {
    tweet_mentions_model = apiary.model('tweet_mentions');
    if (run) {
        get_mentions();
    }
});

process.on('message', function (m) {

    if (m == 'get mentions') {
        get_mentions(from_parent);
    }

});