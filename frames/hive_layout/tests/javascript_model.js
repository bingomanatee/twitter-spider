var tap = require('tap');
var javascript_model = require('./../lib/resource_models/javascript');

tap.test('javascript_model', function (test) {

    var gamma = {
        url: '/alpha/beta/gamma.js',
        context: 'head',
        name: 'gamma',
        requires: ['e']
    };

    var e = {
        url: '/c/d/e.js',
        context: 'foot',
        name: 'e'

    };

    var scripts = [
        gamma, e
    ];

    var model = javascript_model();

    model.add(scripts);


    var for_head = model.get_context('head');
    test.deepEqual(for_head, [e, gamma], 'calling head got prereqs in order');

    model.render('head'); // should make all scripts register as rendered;

    var for_foot = model.get_context('foot');

    test.deepEqual(for_foot, [], 'after reendering head, foot should contain no scripts');

    test.end();

});