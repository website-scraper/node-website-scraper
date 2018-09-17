const _ = require('lodash');
const path = require('path');
const utils = require('../utils');
const typeExtensions = require('../config/resource-ext-by-type');

module.exports = function generateFilename (resource, options, occupiedFileNames) {
	const occupiedNames = getSubDirectoryNames(options).concat(occupiedFileNames);

	let filename = getFilenameForResource(resource, options);
	filename = utils.shortenFilename(filename);

	const extension = utils.getFilenameExtension(filename);
	const directory = getDirectoryByExtension(extension, options);

	let currentFilename = path.join(directory, filename);
	const basename = path.basename(filename, extension);
	let index = 1;

	while (occupiedNames.includes(currentFilename)) {
		currentFilename = path.join(directory, `${basename}_${index}${extension}`);
		index++;
	}

	return currentFilename;
};

function getFilenameForResource (resource, options) {
	const preferredFilename = resource.getFilename();
	const urlFilename = utils.getFilenameFromUrl(resource.getUrl());
	let filename = preferredFilename || urlFilename || options.defaultFilename;

	const resourceType = resource.getType();
	let extension = utils.getFilenameExtension(filename);

	if (!extension && typeExtensions[resourceType]) {
		extension = typeExtensions[resourceType][0];
		filename += extension;
	}

	return filename;
}

function getSubDirectoryNames (options) {
	return _.map(options.subdirectories, function getDirectory (directory) { return directory.directory; });
}

function getDirectoryByExtension (extension, options) {
	return _(options.subdirectories)
		.filter(function matchesExtension (directory) { return _.includes(directory.extensions, extension); })
		.map(function getDirectory (directory) { return directory.directory; })
		.first() || '';
}
