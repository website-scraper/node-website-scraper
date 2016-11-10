var types = require('./resource-types');

var defaultExtensions = {};

defaultExtensions[types.html] = {
	defaultExtension: '.html',
	possibleExtensions: [ '.html', '.htm' ]
};
defaultExtensions[types.css] = {
	defaultExtension: '.css',
	possibleExtensions: [ '.css' ]
};

module.exports = defaultExtensions;
