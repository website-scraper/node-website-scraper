import url from 'url';
import path from 'path';
import normalize from 'normalize-url';
import typeByMime from '../config/resource-type-by-mime.js';
import typeByExt from '../config/resource-type-by-ext.js';

import logger from '../logger.js';

const MAX_FILENAME_LENGTH = 255;
const IS_URL = /^((http[s]?:)?\/\/)/;

function isUrl (path) {
	return IS_URL.test(path);
}

function getUrl (currentUrl, path) {
	const pathObject = url.parse(path);
	if (isUrl(path) && !pathObject.protocol) {
		const urlObject = url.parse(currentUrl);
		pathObject.protocol = urlObject.protocol;
		path = url.format(pathObject);
	}
	return url.resolve(currentUrl, path);
}

function getUnixPath (filepath) {
	return filepath.replace(/\\/g, '/');
}

function getRelativePath (path1, path2) {
	const dirname = path.dirname(path1);
	const relativePath = path.relative(dirname, path2);
	const escaped = relativePath
		.split(path.sep)
		.map(pathComponent => encodeURIComponent(pathComponent).replace(/['()]/g, c => '%' + c.charCodeAt(0).toString(16)))
		.join(path.sep);
	return getUnixPath(escaped);
}

/**
 * Returns decoded pathname from url
 * Example: https://example.co/path/logo%20(1).svg => /path/logo (1).svg
 * @param u - url
 * @returns {string} decoded pathname
 */
function getPathnameFromUrl (u) {
	const pathname = url.parse(u).pathname;
	try {
		return decodeURI(pathname);
	} catch (e) {
		return pathname;
	}
}

/**
 * Returns filename from given url
 * Example: http://example.com/some/path/file.js => file.js
 * @param {string} u - url
 * @returns {string} filename
 */
function getFilenameFromUrl (u) {
	return path.basename(getPathnameFromUrl(u));
}

/**
 * Returns relative path from given url
 * Example: http://example.com/some/path/file.js => some/path/file.js
 * @param {string} u - url
 * @returns {string} path
 */
function getFilepathFromUrl (u) {
	const nu = normalizeUrl(u, {removeTrailingSlash: true});
	return getPathnameFromUrl(nu).substring(1);
}

function getHashFromUrl (u) {
	return url.parse(u).hash || '';
}

/**
 * Returns host with port from given url
 * Example: http://example.com:8080/some/path/file.js => example.com:8080
 * @param {string} u - url
 * @returns {string} host with port
 */
function getHostFromUrl (u) {
	return url.parse(u).host;
}

/**
 * Returns extension for given filepath
 * Example: some/path/file.js => .js
 * @param {string} filepath
 * @returns {string|null} - extension
 */
function getFilenameExtension (filepath) {
	return (typeof filepath === 'string') ? path.extname(filepath).toLowerCase() : null;
}

function shortenFilename (filename) {
	if (filename.length >= MAX_FILENAME_LENGTH) {
		const shortFilename = filename.substring(0, 20) + getFilenameExtension(filename);
		logger.debug(`[utils] shorten filename: ${filename} -> ${shortFilename}`);
		return shortFilename;
	}
	return filename;
}

function normalizeUrl (u, opts) {
	try {
		return normalize(u, extend({removeTrailingSlash: false, stripHash: true}, opts));
	} catch (e) {
		return u;
	}
}

function urlsEqual (url1, url2) {
	return normalizeUrl(url1) === normalizeUrl(url2);
}

function isUriSchemaSupported (path) {
	const protocol = url.parse(path).protocol;
	return !protocol || protocol && isUrl(path);
}

function getTypeByMime (mimeType) {
	return typeByMime[mimeType];
}

function getTypeByFilename (filename) {
	const ext = getFilenameExtension(filename);
	return typeByExt[ext];
}

function extend (first, second) {
	return Object.assign({}, first, second);
}

function union (first = [], second = []) {
	const merged = first.concat(second);
	return merged.filter((item, index, array) => array.findIndex(el => Object.keys(el).every(k => el[k] === item[k])) === index);
}

function isPlainObject (value) {
	return value instanceof Object && Object.getPrototypeOf(value) === Object.prototype;
}

function prettifyFilename (filename, {defaultFilename}) {
	if (filename === defaultFilename || filename.endsWith('/' + defaultFilename)) {
		return filename.slice(0, -defaultFilename.length);
	}
	return filename;
}

async function series (promises) {
	const results = [];
	for (let i = 0; i < promises.length; i++) {
		const result = await promises[i]();
		results.push(result);
	}
	return results;
}

function getCharsetFromCss (cssText) {
	const CHARSET_REGEXP = /(?:@charset\s)(("(.*?)")|('(.*?)'))[\s;]/;
	const hasCharset = cssText.startsWith('@charset');

	if (hasCharset) {
		const charsetMatch = CHARSET_REGEXP.exec(cssText);
		const charset = charsetMatch?.[3] || charsetMatch?.[5];
		return charset?.toLowerCase() ?? null;
	} else {
		return null;
	}
}

function updateResourceEncoding (resource, encoding) {
	logger.debug(`updating encoding of resource ${resource} to ${encoding}`);

	const resourceText = resource.getText();

	if (resourceText) {
		const updatedText = Buffer.from(resourceText, resource.getEncoding()).toString(encoding);
		resource.setText(updatedText);
	}
	
	resource.setEncoding(encoding);
}

export {
	isUrl,
	getUrl,
	getUnixPath,
	getRelativePath,
	getFilenameFromUrl,
	getFilepathFromUrl,
	getFilenameExtension,
	getHashFromUrl,
	getHostFromUrl,
	shortenFilename,
	prettifyFilename,
	normalizeUrl,
	urlsEqual,
	isUriSchemaSupported,
	getTypeByMime,
	getTypeByFilename,
	extend,
	union,
	isPlainObject,
	series,
	getCharsetFromCss,
	updateResourceEncoding
};
