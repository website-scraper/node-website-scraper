const _ = require('lodash');
const path = require('path');
const utils = require('../utils');
const resourceTypes = require('../config/resource-types');
const resourceTypeExtensions = require('../config/resource-ext-by-type');

module.exports = function generateFilename (resource, {defaultFilename}) {
	const resourceUrl = resource.getUrl();
	const host = utils.getHostFromUrl(resourceUrl);
	let filePath = utils.getFilepathFromUrl(resourceUrl);
	const extension = utils.getFilenameExtension(filePath);

	filePath = path.join(host.replace(':', '_'), filePath);

	// If we have HTML from 'http://example.com/path' => set 'path/index.html' as filepath
	if (resource.isHtml()) {
		const htmlExtensions = resourceTypeExtensions[resourceTypes.html];
		const resourceHasHtmlExtension = _.includes(htmlExtensions, extension);
		// add index.html only if filepath has ext != html '/path/test.com' => '/path/test.com/index.html'
		if (!resourceHasHtmlExtension) {
			filePath = path.join(filePath, defaultFilename);
		}
	}

	return sanitizeFilepath(filePath);
};

function sanitizeFilepath (filePath) {
	filePath = path.normalize(filePath);
	let pathParts = filePath.split(path.sep);
	pathParts = _.pull(pathParts, '..');
	pathParts[pathParts.length - 1] = utils.shortenFilename(_.last(pathParts));
	return pathParts.join(path.sep);
}
