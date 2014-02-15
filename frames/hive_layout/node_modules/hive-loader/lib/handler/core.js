var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;

/* ************************************
 * 
 * ************************************ */

/* ********* EXPORTS ******** */

module.exports = function (core) {
	if (core){
		this.set_config('core', core);
		this.emit('core', core);
	}
	return this.get_config('core');
}; // end export function