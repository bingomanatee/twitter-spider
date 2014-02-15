var Twitter = require('twit');
var _ = require('underscore');
var async = require('async');
var util = require('util');

function _graph_network(twitter, level, done) {

    var graph = {};

    function _graph_new_friends() {
        var user_names = _.uniq(_.reduce(graph, function (out, friends) {

            return out.concat(_.pluck(friends, 'name'));
        }, []));

        return _.difference(user_names, _.keys(graph));
    }

    _graph_friends(['david_edelhart'], twitter, level, function () {
        done(graph);
    });

    function _graph_friends(names, twitter, level, done) {
        console.log('graphing %s friends: %s...', names.length, names.slice(0, 20));
        var worker = async.cargo(function (name, cargo_done) {
            twitter.get('/friends/list', {screen_name: name, count: 200, skip_status: 1, include_user_entities: false },
                function (err, data) {
                    if (err) {
                        console.log('error: %s', err);
                        return cargo_done(err);
                    }
                    console.log('friends of %s: %s', name, util.inspect(data).substr(0, 400));
                    if (data.users){
                       graph[name] = data.users;
                    }
                    cargo_done();
                });
        }, 3);

        worker.drain = function () {
            if (level < 1) {
                done();
            } else {
                var new_friends = _graph_new_friends();
                _graph_friends(new_friends, twitter, --level, done);
            }
        };

        worker.push(names);
    }

}

module.exports = {

    "on_input": function (ctx, done) {

        _graph_network(twitter, 2, function (graph) {
            var names = _.keys(graph);
            console.log('%s friends: %s ...', names.length, names.slice(0, 20));
            done();
        })
    }

}