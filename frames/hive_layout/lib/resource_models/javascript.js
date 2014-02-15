var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var Base = require('./base');

/* ************************************
 * note = the js_model that is returned is unique
 * for every request.
 * ************************************ */

/* ******* CLOSURE ********* */

var script_template = _.template("\n<script src=\"<%= url %>\" <%= defer ? ' defer=\"defer\" ' : '' %> >\n" +
	"// requires <%= requires.join(', ') %>\n" +
	"</script>");

var script_head_template = _.template("\n\n<!-- -------- SCRIPTS FOR <%= context %> ---------- -->\n\n");
var script_foot_template = _.template("\n\n<!-- -------- END OF SCRIPTS FOR <%= context %> ---------- -->\n\n");

function merge(new_data, old_data){
	if(old_data.defer){
		new_data.defer = true;
	}

	if(!new_data.requires){
		new_data.requires = [];
	}

	if (old_data.requires){
		new_data.requires.push.call(new_data.requires, old_data.requires);
	}

	if(old_data.name){
		new_data.name = old_data.name;
	}

	return new_data;
}

function is_rendered(script){
	if (this.rendered_things[script.url]){
		return true;
	} else if(script.name){
		if(this.rendered_things[script.name]){
			return true;
		}
	}
	return false;
}

function render(context){
	var scripts = this.get_context(context);

	//@TODO: order by requirements
	var out = script_head_template({context: context});
	scripts.forEach(function(script){
		if (!this.is_rendered(script)) {
			out += script_template(_.extend({},script, {defer: false, requires: []}));
			this.rendered_things[script.url] = true;
            if (script.name){
                this.rendered_things[script.name] = true;
            }
		}
	}, this);
	out += script_foot_template({context:context });
	return out;
}

/* ********* EXPORTS ******** */

module.exports = function (apiary) {

	var model = Base({
        is_rendered: is_rendered,
        merge: merge,
        render: render
    });

    model.set_config('rendered_things', {});
	model.rendered_things = {};

	model.on('record', function(script){
		if(!script.defer){
			script.defer = false;
		}
		if (!script.requires){
			script.requires = [];
		}
	});

	return model;
}; // end export function