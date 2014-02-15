var loader = require('./../../index');
var Loader = loader.loader;
var Handler = loader.handler;
var _ = require('underscore');


var _mixins = {name: 'txt_handler', respond: function (params) {
	//	console.log('%s, responding to %s', util.inspect(target), params.file);
	this.files.push(params.file);
}};

module.exports = function (mixins, config, cb) {

	return Handler(
		[
			mixins, _mixins
		],
		[
			config,
			{name_filter: ['(.*)\.txt', 'i']}
		]
		, cb);
}