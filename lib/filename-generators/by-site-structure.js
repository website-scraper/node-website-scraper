var url = require('url');
var path = require('path');
var utils = require('../utils');

module.exports = function generateFilename (resource, options) {
	var urlObject = url.parse(resource.getUrl());
	var extension = utils.getFilenameExtension(urlObject.pathname);
	if (resource.isHtml() && !extension) {
		var fileName = options.defaultFilename + (urlObject.search || '');
		return getSafeAbsoluteFilename(path.join(urlObject.pathname || '/', fileName));
	} else {
		return getSafeAbsoluteFilename(urlObject.pathname);
	}
};

function getSafeAbsoluteFilename (urlPath){
	urlPath = path.normalize(urlPath);

	var safeFileName = urlPath.replace(/\.\./g, '.');
	safeFileName = path.normalize(safeFileName);
	return safeFileName;
}
