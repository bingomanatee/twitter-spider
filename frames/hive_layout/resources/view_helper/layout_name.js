var _ = require('underscore');
var util = require('util');
var path = require('path');
var DEBUG = true;

module.exports = function (apiary, cb) {

    var helper = {
        name: 'layout_name',

        test: function (ctx, output) {
            var action = ctx.$action;
            var hive = action.get_config('hive');
            var frame = hive.get_config('frame');
            return action.has_config('layout_name') || hive.has_config('layout_name') || frame.has_config('layout_name');
        },

        weight: -100,

        respond: function (ctx, output, cb) {
            var action = ctx.$action;
            var hive = action.get_config('hive');
            var frame = hive.get_config('frame');
            output.layout_name = action.get_config('layout_name') || hive.get_config('layout_name') || frame.get_config('layout_name');
            cb(null, ctx, output);
        }
    };

    cb(null, helper);
};