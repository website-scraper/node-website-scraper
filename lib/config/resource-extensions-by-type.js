var types = require('./resource-types');

var defaultExtensions = {};

defaultExtensions[types.html] = '.html';
defaultExtensions[types.css] = '.css';

module.exports = defaultExtensions;
