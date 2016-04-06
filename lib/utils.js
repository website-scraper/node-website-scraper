var url = require('url');
var path = require('path');
var _ = require('underscore');
var Promise = require('bluebird');

function isUrl (path) {
	var urlRegexp = /^((http[s]?:)?\/\/)/;
	return urlRegexp.test(path);
}

function getUrl (currentUrl, path) {
	var pathObj = url.parse(path);
	if (isUrl(path) && !pathObj.protocol) {
		pathObj.protocol = 'http';
		path = url.format(pathObj);
	}
	return url.resolve(currentUrl, path);
}

function getUnixPath (filepath) {
	return filepath.replace(/\\/g, '/');
}

function getRelativePath (path1, path2) {
	var dirname = path.dirname(path1);
	var relativePath = path.relative(dirname, path2);
	return getUnixPath(relativePath);
}

function getFilenameFromUrl (u) {
	return path.basename(url.parse(u).pathname);
}

function getHashFromUrl (u) {
	return url.parse(u).hash || '';
}

function waitAllFulfilled (promises) {
	return Promise.all(promises.map(function returnWhenFulfilled (promise) {
		return promise.reflect();
	}));
}

function createOutputObject (resource) {
	var assets = _.chain(resource.getChildren())
		.map(createOutputObject)
		.uniq()
		.value();

	return {
		url: resource.getUrl(),
		filename: resource.getFilename(),
		assets: assets
	};
}

module.exports = {
	isUrl: isUrl,
	getUrl: getUrl,
	getUnixPath: getUnixPath,
	getRelativePath: getRelativePath,
	getFilenameFromUrl: getFilenameFromUrl,
	getHashFromUrl: getHashFromUrl,
	waitAllFulfilled: waitAllFulfilled,
	createOutputObject: createOutputObject
};
