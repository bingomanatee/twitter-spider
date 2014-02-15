var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var ejs = require('ejs');
var hm = require('hive-menu');

/* ************************************
 *
 * ************************************ */

/* ******* CLOSURE ********* */

var _sidebar;
var SIDEBAR_TEMPLATE = path.resolve(__dirname, 'sidebar_template.html');

/* ********* EXPORTS ******** */

module.exports = function (apiary, cb) {

    if (_DEBUG) console.log('reading %s', SIDEBAR_TEMPLATE);
	fs.readFile(SIDEBAR_TEMPLATE, 'utf8', function(err, txt){

		_sidebar = ejs.compile(txt);
        if (_DEBUG) console.log('... loaded and compiled sidebar template.');

		var helper = {

			name: 'main_menu',

			test: function (ctx, output) {
                // note there are other places that layout name can be specified
                // so this is a "lazy test" to make sure that another layout wasn't named.
				return (!output.layout_name) || (output.layout_name == 'bootstrap');
			},

			weight: -55,

			respond: function (ctx, output, done) {
				if (!output.helpers){
					output.helpers = {};
				}

				var site_menu = new hm.Menu({
					name: 'site',
					title: 'Site',
					items: [
						{name: 'home', title: 'Home', link: '/', weight: -1000000},
                        {name: 'another_page', title: 'A page in your site', link: '/a_page', weight: 0}
					]
				})

				var menu = new hm.Menu({name: 'sidebar', title: '', items: [
					site_menu
				]});

				output.helpers.sidebar_menu_data = menu;
                output.helpers.site_menu = site_menu;

				output.helpers.sidebar_menu = function(){
					return _sidebar(output.helpers.sidebar_menu_data.toJSON());
				};

                done();
			}
		};

		cb(null, helper);

	})

};