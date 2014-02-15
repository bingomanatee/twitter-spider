var _ = require('underscore');
var util = require('util');
var path = require('path');
var _DEBUG = false;
var js_model = require('./../../lib/resource_models/javascript');
var css_model = require('./../../lib/resource_models/css');

module.exports = function (apiary, cb) {

	var helper = {
		name: 'client_side_resources',

		test: function (ctx, output) {
			return true;
		},

		weight: 10000,

		respond: function (ctx, output, cb) {
			var action = ctx.$action;
			var hive = action.get_config('hive');
			var layout = output.layout;

            function _collect(resource, model){

                var action_js = action.get_config(resource, []);
                var hive_js = hive.get_config(resource, []);
                var layout_js = layout ? layout.get_config(resource, []) : [];
                var output_js = output[resource] || [];

                var data = model(apiary);

                data.add(layout_js);
                data.add(hive_js);
                data.add(action_js);
                data.add(output_js);
                
                return data;
            }


			output.js_model = _collect('javascript', js_model);
            output.css_model = _collect('css', css_model);
			cb();
		}
	};

	cb(null, helper);
};