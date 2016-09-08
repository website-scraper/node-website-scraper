var _ = require('lodash');
var url = require('url');
var path = require('path');
var utils = require('../utils');

module.exports = function generateFilename (resource, options) {
	var resourceUrl = resource.getUrl();

	var urlObject = url.parse(resourceUrl);

	var filePath = utils.getFilepathFromUrl(resourceUrl);
	var extension = utils.getFilenameExtension(filePath);
	var fileName;

	// If we have HTML from 'http://example.com/path' => set 'path/index.html' as filepath

	/* TODO clarify why do we need urlObject.search
	* so we do 'http://example.com/path?abc=def' => set 'path/index.html?abc=def'
	* but 'http://example.com/path/index.html?abc=def' => set 'path/index.html'
	*/
	if (resource.isHtml() && !extension) {
		fileName = options.defaultFilename + (urlObject.search || '');
		filePath = path.join(filePath, fileName);
	}

	return sanitizeFilepath(filePath);
};

// function getSafeRelativeFilename (urlPath) {
// 	var fileName = urlPath.substring(1);
// 	return sanitizeFileName(fileName);
// }

function sanitizeFilepath (filePath) {
	filePath = path.normalize(filePath);
	var pathParts = filePath.split(path.sep);
	pathParts = _.pull(pathParts, '..');
	pathParts[pathParts.length - 1] = utils.shortenFilename(_.last(pathParts));
	return pathParts.join(path.sep);
}
