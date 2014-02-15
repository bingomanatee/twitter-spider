var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var Base = require('./base');

/* ************************************
 * note = the css_model that is returned is unique
 * for every request.
 * ************************************ */

/* ******* CLOSURE ********* */

var css_template = _.template("\n<link rel=\"stylesheet\" href=\"<%= url %>\">");

var css_head_template = _.template("\n\n<!-- -------- CSS FOR <%= context %> ---------- -->\n\n");
var css_foot_template = _.template("\n\n<!-- -------- END OF CSS FOR <%= context %> ---------- -->\n\n");

function merge(new_data, old_data) {
    if (old_data.defer) {
        new_data.defer = true;
    }

    if (!new_data.requires) {
        new_data.requires = [];
    }

    if (old_data.requires) {
        new_data.requires.push.call(new_data.requires, old_data.requires);
    }

    if (old_data.name) {
        new_data.name = old_data.name;
    }

    return new_data;
}

function is_rendered(css) {
    if (this.rendered_things[css.url]) {
        return true;
    } else if (css.name) {
        if (this.rendered_things[css.name]) {
            return true;
        }
    }
    return false;
}

function find(query) {
    return _.filter(this.items, function (item) {
        if (query.url && (item.url != query.url)) {
            return false;
        }
        if (query.context && (item.context != query.context)) {
            return false;
        }

        if (query.name && (item.name != query.name)) {
            return false;
        }

        return true;
    })
}

function render(context) {
    console.log('rendering css with model %s', this.component_id);
    console.log('getting css for %s from %s', context, util.inspect(this.all().records()));
    var csss = this.find({context: context}).records();
    //@TODO: order by requirements
    var out = css_head_template({context: context});
    console.log('returning %s', util.inspect(out));
    csss.forEach(function (css) {
        if (!this.is_rendered(css)) {
            out += css_template(css);
            this.rendered_things[css.url] = true;
            if (css.name) {
                this.rendered_things[css.name] = true
            }
        }
    }, this);
    out += css_foot_template({context: context });
    return out;
}

/* ********* EXPORTS ******** */

module.exports = function (apiary) {
    //var alias_model = apiary.model('css_path_alias');

    var model = Base({
        is_rendered: is_rendered,
        merge: merge,
        rendered_things: {}
    });

    model.on('record', function (css) {
        if (!css.defer) {
            css.defer = false;
        }
        if (!css.requires) {
            css.requires = [];
        }
    });

    model.render = render;

    return model;
}; // end export function