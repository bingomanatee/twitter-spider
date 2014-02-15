var _ = require('underscore');
var Gate = require('gate');
var fs = require('fs');
var path = require('path');
var _DEBUG = false;
var util = require('util');

var loaded_paths = {};

module.exports = function (cb, root, handlers) {

	if (!this.core()){
		throw new Error('loader attempting to load without core');
	}
	var core = this.core();

	var self = this;

	if (this._loaded) {
		throw new Error('attempting to reload loaded component');
	} else {
		this._loaded = true;
	}

	if (!root) {
		root = this.get_config('root');
	} else {
		if (_DEBUG) {
			console.log('root passed in: %s', root);
		}
	}

	if (!root) {
		throw new Error(util.format('no root path defined for loader %s', util.inspect(this)));
	}

	if (_DEBUG) console.log('loading %s (%s)', root, this.component_id);

	var my_handlers = this.get_config('handlers');
	if (handlers) {
		handlers = handlers.concat(my_handlers);
	} else {
		handlers = my_handlers;
	}

	this.removeAllListeners('file');
	this.removeAllListeners('dir');
	var loader = this;

	if (_DEBUG) {
		console.log('handlers: %s', util.inspect(handlers));
	}
	if (this.config().has('target')) {
		var target = this.get_config('target');
	} else {
		var target = loader;
	}
	//	console.log('self is %s', this.name);
	_.each(handlers, function (handler) {
		handler.core(self.core());
		if (!(handler.TYPE == 'Handler')) {
			throw new Error(util.format('bad handler in %s: %s', self.name, util.inspect(handler)))
		}
		if (_DEBUG) {
			console.log('adding handler %s', handler.name);
		}

		function _handle(params) {
			params.core = core;
			if (_DEBUG) {
				console.log(' testing %s with handler %s(%s)', params.file, handler.name, handler.get_config('name_filter'));
			}
			if (handler.handles(params, loader)) {
				handler.respond.call(target, params);
			}
		}

		if (handler.get_config('dir')) {
			if (_DEBUG) {
				console.log('emitting dir');
			}
			loader.on('dir', _handle);
		} else {
			if (_DEBUG) {
				console.log('emitting file');
			}
			loader.on('file', _handle);
		}
	});

	var gate = Gate.create();
	fs.readdir(root, function (err, files) {

		if (loader.test){
			files = _.filter(files, loader.test, self);
		}

		_.each(files, function (file) {
			var file_path = path.resolve(root, file);
			var params = {
				file:      file,
				root:      root,
				gate:      gate,
				file_path: file_path
			}
			var stat = fs.statSync(file_path);
			if (stat.isFile()) {
				if (_DEBUG) {
					console.log('emitting file %s', file_path);
				}
				loader.emit('file', params);
			} else {
				if (_DEBUG) {
					console.log('%s is not file', file_path);
				}
			}

			if (stat.isDirectory()) {
				loader.emit('dir', params);
			} else {
				if (_DEBUG) {
					console.log('%s is not dir', file_path);
				}
			}

		})
		gate.await(cb);
	})
}