var mongoose = require('mongoose');
var mvc = require('hive-mvc');
var tap = require('tap');
var _ = require('underscore');
var util = require('util');
var path = require('path');
var dbname = 'test_db_' + Math.round(10000 * Math.random());
mongoose.connect('mongodb://localhost/' + dbname);
var apiary = mvc.Apiary(_.extend({mongoose: mongoose, frame_filter: ['twittergraph']}, require('./../../../passport_config.json')),
    path.resolve(__dirname, '../../../frames')
);

function _user_boildown(item) {
    return _.pick(item, 'id', 'screen_name', 'load_status');
}
apiary.init(function () {
    var user_model = apiary.model('twitter_user');

    tap.test('users', function (test) {

        test.test('serialize and deserialize user query',  function (sdtest) {

            var data = {id: [10, 20, 30], screen_name: 'david_edelhart'}
            var ser = user_model.serialize_params(data);

            sdtest.deepEqual(ser, [
                {type: 'screen_name', value: 'david_edelhart'},
                {type: 'id', value: 10},
                {type: 'id', value: 20},
                {type: 'id', value: 30}
            ], 'serialized query data');

            var deser = user_model.deserialize_params(ser);

            data.screen_name = [data.screen_name];
            sdtest.deepEqual(deser, data, 'deserialized');

            var without_users = user_model.remove_users_from_data([
                {id: 20, screen_name: 'fred'},
                {id: 40, screen_name: 'david_edelhart'}
            ], ser);

            sdtest.deepEqual(without_users, [
                { type: 'id', value: 10 },
                { type: 'id', value: 30 }
            ], 'users removed');

            sdtest.end();
        });

        test.test('fetch users', function (ftest) {

            ftest.test('fetch user parts', function (utest) {

                var input = [
                    {id: 100, screen_name: 'fred', name: 'Fred Flintstone'},
                    {id: 200, screen_name: 'barney', name: 'Barney Rubble'},
                    {id: 300, screen_name: 'wilma', name: 'Wilma Flintstone'}
                ];

                user_model.add(input, function (err, users) {
                    utest.deepEqual(_.map(users, function (user) {
                        return _.pick(user, 'id', 'screen_name', 'name')
                    }),
                        input, 'user input added; names, id pass schema'
                    );

                    user_model.find_users({id: [100, 200]}, function (err, users) {
                        utest.deepEqual(_.pluck(users, 'id'), [100, 200], 'found users');

                        user_model.find_users({id: 300, screen_name: ['fred']}, function (err, users) {
                            utest.deepEqual(_.pluck(users, 'id'), [100, 300], 'found users');

                            var data = user_model.serialize_params({id: [100, 500], screen_name: ['wilma', 'dave']});
                            var slim_data = user_model.remove_users_from_data(users, data);
                            utest.deepEqual(slim_data, [
                                { type: 'screen_name', value: 'dave' },
                                { type: 'id', value: 500 }
                            ], 'removing real users from data');

                            user_model.queue_users(data, function (err, data) {

                                return utest.end();
                                var qd = data.map(_user_boildown);
                                utest.deepEqual(qd, [
                                    { id:            undefined,
                                        screen_name: 'dave',
                                        load_status: 'queued' },
                                    { id: 500, screen_name: undefined, load_status: 'queued' }
                                ], 'queued items')
                                utest.end();
                            })

                        })
                    });
                })

            });

            ftest.test('end to end fetch', function (etest) {

                user_model.empty(function (err) {

                    user_model.all(function (err, data) {
                        etest.deepEqual(data, [], 'starting empty');

                        var input = [
                            {id: 100, screen_name: 'fred', name: 'Fred Flintstone'},
                            {id: 200, screen_name: 'barney', name: 'Barney Rubble'},
                            {id: 300, screen_name: 'wilma', name: 'Wilma Flintstone'}
                        ];
                        user_model.add(input, function () {
                            user_model.fetch({screen_name: ['fred', 'dave_edelhart']}, function () {
                                user_model.all(function (err, data) {

                                    etest.deepEqual(data.map(_user_boildown), [
                                        { id: 100, screen_name: 'fred', load_status: undefined },
                                        { id: 200, screen_name: 'barney', load_status: undefined },
                                        { id: 300, screen_name: 'wilma', load_status: undefined },
                                        { id:            undefined,
                                            screen_name: 'dave_edelhart',
                                            load_status: 'queued' }
                                    ], 'have queued some users');

                                    etest.end();
                                });
                            });

                        });

                    })

                });

            })
        });

        test.on('end', function () {
            console.log('disconnecting mongosose');
            var conn = _.where(mongoose.connections, {name: dbname})[0];

            if (conn) {
                conn.db.dropDatabase(function () {
                    mongoose.disconnect();
                });
            } else {
                mongoose.disconnect();
            }
        });

        test.end();

    })
});