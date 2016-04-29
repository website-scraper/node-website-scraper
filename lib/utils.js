var url = require('url');
var path = require('path');
var _ = require('lodash');
var Promise = require('bluebird');

function isUrl (path) {
	var urlRegexp = /^((http[s]?:)?\/\/)/;
	return urlRegexp.test(path);
}

function getUrl (currentUrl, path) {
	var pathObject = url.parse(path);
	if (isUrl(path) && !pathObject.protocol) {
		var urlObject = url.parse(currentUrl);
		pathObject.protocol = urlObject.protocol;
		path = url.format(pathObject);
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

function createOutputObject (resource, outputObjectsByUrl) {
	outputObjectsByUrl = outputObjectsByUrl || {};

	var outputObject = {
		url: resource.getUrl(),
		filename: resource.getFilename()
	};
	outputObjectsByUrl[outputObject.url] = outputObject;

	outputObject.assets = _.map(resource.getChildren(), function getOrCreateChildOutputObject (childResource){
		return outputObjectsByUrl[childResource.getUrl()] || createOutputObject(childResource, outputObjectsByUrl);
	});

	return outputObject;
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
