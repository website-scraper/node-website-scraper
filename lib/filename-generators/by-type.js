var _ = require('lodash');
var path = require('path');
var utils = require('../utils.js');

module.exports = function generateFilename (resource, options, loadedResources) {
	var occupiedFilenames = getOccupiedFilenames(loadedResources, options);

	var preferredFilename = resource.getFilename();
	var urlFilename = utils.getFilenameFromUrl(resource.getUrl());
	var filename = preferredFilename || urlFilename || options.defaultFilename;

	var extension = path.extname(filename);
	var directory = getDirectoryByExtension(extension, options);
	var currentFilename = path.join(directory, filename);
	var basename = path.basename(filename, extension);
	var index = 1;

	while (_.includes(occupiedFilenames, currentFilename)) {
		currentFilename = path.join(directory, basename + '_' + index + extension);
		index++;
	}
	return currentFilename;
};

function getOccupiedFilenames (loadedResources, options) {
	var subdirectories = _.map(options.subdirectories, function getDirectory (directory) { return directory.directory; });
	var loadedFiles = _.map(loadedResources, function getFileName (resource) { return resource.getFilename(); });
	return subdirectories.concat(loadedFiles);
}

function getDirectoryByExtension (extension, options) {
	return _(options.subdirectories)
			.filter(function matchesExtension (directory) { return _.includes(directory.extensions, extension); })
			.map(function getDirectory (directory) { return directory.directory; })
			.first() || '';
}
