var hive_loader = require('hive-loader');
var layouts_loader = require('./../loaders/layouts_loader')
var _DEBUG = false;


module.exports = function(){
	var _mixins = {
		name:    'layouts_handler',
		respond: function (params) {
			if (_DEBUG) console.log('layouts_handler: found dir (layouts) %s', params.file_path);
			var ll = layouts_loader(params.file_path);
			ll.core(params.core);
			ll.load(params.gate.latch());
		}
	};

	var handler = hive_loader.handler(_mixins, {dir: true, name_filter: /layout(s)?/i});

	return handler;
}