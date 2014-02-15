var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var events = require('events');
var hive_model = require('hive-model');
var order = require('order-by-prereq');

/* ************************************
 * This is a generic list of resources.
 * Unlike the other memory-persistent models in an apiary,
 * this is a short term collection of data
 * that only lives as long as a request.
 * ************************************ */

/* ******* CLOSURE ********* */

function Resource_Model_Base(mixins) {

    var dataspace = {add: _.identity};

    var base_mixins = [
        {
            /**
             * note - override with a more context-relevant property merge
             *
             * @param new_data {object}
             * @param old_data {object}
             */
            merge: function (new_data, old_data) {
                _.defaults(new_data, old_data);
            },

            get_context: function (context) {
                var items = this.find({context: context}).records();
                var reqs = _.compact(_.flatten(_.pluck(items, 'requires')));
                if (reqs.length){

                _.each(reqs, function (r) {
                    var found = this.find({name: r}).one();
                    if (!found) {
                        items.push({name: r, url: '/not_found/' + r, context: context});
                    } else {
                        items.push(found);
                    }
                }, this);
                    items = order.OrderByPrereq(items, 'name', 'requires');
            }

                return _.reject(items, function(s){ return s.rendered});
            }
        }
    ];

    if (_.isArray(mixins)) {
        base_mixins = base_mixins.concat(mixins);
    } else if (_.isObject(mixins)) {
        base_mixins.push(mixins);
    }

    return hive_model.Model(base_mixins, {}, dataspace);

}

/* ********* EXPORTS ******** */

module.exports = Resource_Model_Base;