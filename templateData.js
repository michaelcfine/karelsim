const fs = require('fs');

// --------------------------------------------------------------------------------
const config = {
	// foo: { dir: './src/pages/foo', urlPrefix: '/foo' },
};
// --------------------------------------------------------------------------------

const data = {};

Object.keys(config).forEach(function(key) {
	if ( typeof config[key] === 'object' && config[key].hasOwnProperty('dir') ) {
		data[key] = [];
		fs.readdirSync(config[key].dir).forEach(fileName => {
			baseName = fileName.split('.').slice(0, -1).join('.'); // Will bomb if no extension
			data[key].push(config[key].urlPrefix + '/' + baseName);
		});
	} else {
		data[key] = config[key];
	}
});

exports.data = data;
