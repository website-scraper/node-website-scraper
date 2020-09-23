const _ = require('lodash');
const path = require('path');
const url = require('url');
const sanitizeFilename = require('sanitize-filename');
const utils = require('../utils');
const resourceTypes = require('../config/resource-types');
const resourceTypeExtensions = require('../config/resource-ext-by-type');

module.exports = function generateFilename (resource, {defaultFilename}) {
	const resourceUrl = resource.getUrl();
	const host = utils.getHostFromUrl(resourceUrl);
	const urlParsed = url.parse(resourceUrl);
	let filePath = utils.getFilepathFromUrl(resourceUrl);
	const extension = utils.getFilenameExtension(filePath);

	filePath = path.join(host, filePath);

	// If have query string
	if (urlParsed.query) {
		const parsed = path.parse(filePath);
		const basename = path.join(parsed.dir, parsed.name);
		// Use the query string as file name in the site structure directory
		if (!extension) {
			// Without extension: http://example.com/path?q=test => path/q=test
			filePath = `${basename}${path.sep}${urlParsed.query}`;
		} else {
			// With extension: http://example.com/path/picture.png?q=test => path/picture_q=test.png
			filePath = `${basename}_${urlParsed.query}${extension}`;
		}
	}

	// If we have HTML from 'http://example.com/path' => set 'path/index.html' as filepath
	if (resource.isHtml()) {
		const htmlExtensions = resourceTypeExtensions[resourceTypes.html];
		const resourceHasHtmlExtension = _.includes(htmlExtensions, extension);
		// add index.html only if filepath has ext != html '/path/test.com' => '/path/test.com/index.html'
		if (!resourceHasHtmlExtension) {
			if (!urlParsed.query) {
				// Without query string: http://example.com/path => path/index.html
				filePath = path.join(filePath, defaultFilename);
			} else {
				// With query string: http://example.com/path?q=test => path/q=test.html
				filePath = `${filePath}.html`;
			}
		}
	}

	return sanitizeFilepath(filePath);
};

function sanitizeFilepath (filePath) {
	filePath = path.normalize(filePath);
	const pathParts = filePath.split(path.sep).map(pathPart => sanitizeFilename(pathPart, {replacement: '_'}));
	pathParts[pathParts.length - 1] = utils.shortenFilename(_.last(pathParts));
	return pathParts.join(path.sep);
}
