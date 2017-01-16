var url = require('url');
var path = require('path');
var Promise = require('bluebird');
var normalizeUrl = require('normalize-url');
var htmlEntities = require('he');
var typeByMime = require('./config/resource-type-by-mime');
var typeByExt = require('./config/resource-type-by-ext');

var logger = require('./logger');

var MAX_FILENAME_LENGTH = 255;
var IS_URL = /^((http[s]?:)?\/\/)/;

function isUrl (path) {
	return IS_URL.test(path);
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

/**
 * Returns filename from given url
 * Example: http://example.com/some/path/file.js => file.js
 * @param {string} u - url
 * @returns {string} filename
 */
function getFilenameFromUrl (u) {
	return path.basename(url.parse(u).pathname);
}

/**
 * Returns relative path from given url
 * Example: http://example.com/some/path/file.js => some/path/file.js
 * @param {string} u - url
 * @returns {string} path
 */
function getFilepathFromUrl (u) {
	var normalizedUrl = normalizeUrl(u);
	return url.parse(normalizedUrl).pathname.substring(1);
}

function getHashFromUrl (u) {
	return url.parse(u).hash || '';
}

/**
 * Returns extension for given filepath
 * Example: some/path/file.js => .js
 * @param {string} filepath
 * @returns {string|null} - extension
 */
function getFilenameExtension (filepath) {
	return (typeof filepath === 'string') ? path.extname(filepath) : null;
}

function shortenFilename (filename) {
	if (filename.length >= MAX_FILENAME_LENGTH) {
		var shortFilename = filename.substring(0, 20) + getFilenameExtension(filename);
		logger.debug('shorten filename: ' + filename + ' -> ' + shortFilename);
		return shortFilename;
	}
	return filename;
}

function waitAllFulfilled (promises) {
	return Promise.all(promises.map(function returnWhenFulfilled (promise) {
		return promise.reflect();
	}));
}

function urlsEqual (url1, url2) {
	return normalizeUrl(url1) === normalizeUrl(url2);
}

function isUriSchemaSupported (path) {
	var protocol = url.parse(path).protocol;
	return !protocol || protocol && isUrl(path);
}

function getTypeByMime (mimeType) {
	return typeByMime[mimeType];
}

function getTypeByFilename (filename) {
	var ext = getFilenameExtension(filename);
	return typeByExt[ext];
}

function decodeHtmlEntities (text) {
	return typeof text === 'string' ? htmlEntities.decode(text) : '';
}

module.exports = {
	isUrl: isUrl,
	getUrl: getUrl,
	getUnixPath: getUnixPath,
	getRelativePath: getRelativePath,
	getFilenameFromUrl: getFilenameFromUrl,
	getFilepathFromUrl: getFilepathFromUrl,
	getFilenameExtension: getFilenameExtension,
	getHashFromUrl: getHashFromUrl,
	shortenFilename: shortenFilename,
	waitAllFulfilled: waitAllFulfilled,
	normalizeUrl: normalizeUrl,
	urlsEqual: urlsEqual,
	isUriSchemaSupported: isUriSchemaSupported,
	getTypeByMime: getTypeByMime,
	getTypeByFilename: getTypeByFilename,
	decodeHtmlEntities: decodeHtmlEntities
};
