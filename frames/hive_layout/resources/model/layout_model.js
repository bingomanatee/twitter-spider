var _ = require('underscore');
var util = require('util');
var _DEBUG = false;

/* ************************************
 * This model maintains an in-memory collection.
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

var init = 0;
module.exports = function (apiary, cb) {

    if (_DEBUG) console.log('Making layout model %s', init++);
	var model = apiary.Model({
		name: '$layouts',
		_pk:  'name'
	});

	cb(null, model);

}; // end export function