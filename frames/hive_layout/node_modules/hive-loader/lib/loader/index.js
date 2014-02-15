var Component = require('hive-component');
var _mixins = require('./mixins');
var _ = require('underscore');


module.exports = function(mixins, config, cb){
	if (_.isArray(mixins)){
		mixins.push(_mixins);
	}
	else {
		mixins = [mixins, _mixins]
	}
	return Component(mixins, config, cb);
}