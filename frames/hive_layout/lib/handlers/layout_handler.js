var hive_loader = require('hive-loader');
var _DEBUG = false;

module.exports = function () {

	var _mixins = {
		name:    'layout_handler',
		respond: function (params) {

			var apiary = handler.core();

			if (_DEBUG) {
				console.log('loading layout at %s', params.file_path);
			}

			var l = params.gate.latch();

			function _on_layout() {
				var lay = apiary.Layout(params.file_path);

				lay.init(function(){
                    if (_DEBUG) console.log('on_layout handler loading layout %s', lay.name);
                    l();
                });
			}

			debugger;
			_on_layout();
		}
	};

	var handler = hive_loader.handler(_mixins, {dir: true, name_filter: /.*/i});
	return handler;
}