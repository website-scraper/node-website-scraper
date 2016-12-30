var types = require('./resource-types');
var defaultExtensions = {};

// should contain same data as ./resource-type-by-ext
defaultExtensions[types.html] = [ '.html', '.htm' ];
defaultExtensions[types.css] = [ '.css' ];

module.exports = defaultExtensions;
