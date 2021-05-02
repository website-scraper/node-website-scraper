import types from './resource-types.js';
const defaultExtensions = {};

// should contain same data as ./resource-type-by-ext
defaultExtensions[types.html] = [ '.html', '.htm' ];
defaultExtensions[types.css] = [ '.css' ];
defaultExtensions[types.js] = [ '.js' ];

export default defaultExtensions;
