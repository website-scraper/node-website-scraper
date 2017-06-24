var _ = require('lodash');
var path = require('path');
var utils = require('../utils');
var typeExtensions = require('../config/resource-ext-by-type');

module.exports = function generateFilename (resource, options, occupiedFileNames) {
	var occupiedNames = getSubDirectoryNames(options).concat(occupiedFileNames);

	var filename = getFilenameForResource(resource, options);
	filename = utils.shortenFilename(filename);

	var extension = utils.getFilenameExtension(filename);
	var directory = getDirectoryByExtension(extension, options);

	var currentFilename = path.join(directory, filename);
	var basename = path.basename(filename, extension);
	var index = 1;

	while (_.includes(occupiedNames, currentFilename)) {
		currentFilename = path.join(directory, basename + '_' + index + extension);
		index++;
	}

	return currentFilename;
};

function getFilenameForResource (resource, options) {
	var preferredFilename = resource.getFilename();
	var urlFilename = utils.getFilenameFromUrl(resource.getUrl());
	var filename = preferredFilename || urlFilename || options.defaultFilename;

	var resourceType = resource.getType();
	var extension = utils.getFilenameExtension(filename);

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
