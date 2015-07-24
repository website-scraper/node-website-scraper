var url = require('url');
var path = require('path');

function trimFilename(filename) {
	var queryRegexp = /[\?#](.*)$/;
	return filename.replace(queryRegexp, '');
}

function isUrl(path) {
	var urlRegexp = /^((http[s]?:)?\/\/)/;
	return urlRegexp.test(path);
}

function getUrl(currentUrl, path) {
	var pathObj = url.parse(path);
	if (isUrl(path) && !pathObj.protocol) {
		pathObj.protocol = 'http';
		path = url.format(pathObj);
	}
	return url.resolve(currentUrl, path);
}

function getUnixPath(filepath) {
	return filepath.replace(/\\/g, '/');
}

function getRelativePath(path1, path2) {
	var dirname = path.dirname(path1);
	var relativePath = path.relative(dirname, path2);
	return getUnixPath(relativePath);
}

module.exports.isUrl = isUrl;
module.exports.getUrl = getUrl;
module.exports.getUnixPath = getUnixPath;
module.exports.trimFilename = trimFilename;
module.exports.getRelativePath = getRelativePath;
