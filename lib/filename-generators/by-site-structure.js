var _ = require('lodash');
var url = require('url');
var path = require('path');
var utils = require('../utils');

module.exports = function generateFilename (resource, options) {
	var urlObject = url.parse(resource.getUrl());
	var extension = utils.getFilenameExtension(urlObject.pathname);
	if (resource.isHtml() && !extension) {
		var fileName = options.defaultFilename + (urlObject.search || '');
		return getSafeRelativeFilename(path.join(urlObject.pathname || '/', fileName));
	} else {
		return getSafeRelativeFilename(urlObject.pathname);
	}
};

function getSafeRelativeFilename (urlPath){
	var fileName = urlPath.substring(1);
	return sanitizeFileName(fileName);
}

function sanitizeFileName (fileName){
	fileName = path.normalize(fileName);
	var pathParts = fileName.split(path.sep);
	pathParts = _.pull(pathParts, '..');
	return pathParts.join(path.sep);
}
