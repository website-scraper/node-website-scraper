var _ = require('lodash');
var path = require('path');
var utils = require('../utils');

module.exports = function generateFilename (resource, options) {
	var resourceUrl = resource.getUrl();
	var filePath = utils.getFilepathFromUrl(resourceUrl);
	var extension = utils.getFilenameExtension(filePath);

	// If we have HTML from 'http://example.com/path' => set 'path/index.html' as filepath
	if (resource.isHtml() && !extension) {
		filePath = path.join(filePath, options.defaultFilename);
	}

	return sanitizeFilepath(filePath);
};

function sanitizeFilepath (filePath) {
	filePath = path.normalize(filePath);
	var pathParts = filePath.split(path.sep);
	pathParts = _.pull(pathParts, '..');
	pathParts[pathParts.length - 1] = utils.shortenFilename(_.last(pathParts));
	return pathParts.join(path.sep);
}
