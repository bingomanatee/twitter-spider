var loader = require('./../../index');
var Loader = loader.loader;
var Handler = loader.handler;
var _ = require('underscore');
var path = require('path');
var util = require('util')

var dir_handler = require('./../handlers/dir_file');
var file_handler = require('./../handlers/txt_file');

function File_Loader(mixins, config, cb) {

	var fh = file_handler({}, {name_filter: config.name_filter});
	var dh = dir_handler({}, {});

	return Loader(
		[
			mixins,
			{ files: [] ,
				name:     'dir_scanner'}
		],
		[
			{
				handlers: [fh, dh]
			},
			config
		],
		function (err, loader) {
			fh.config().set('target', loader);
			dh.config().set('target', loader);
			if (cb) cb(err, loader);
		});
}

module.exports = File_Loader;
