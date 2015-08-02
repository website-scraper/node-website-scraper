var url = require('url');
var path = require('path');

function getUrl(currentUrl, path) {
	var pathObj = url.parse(path);
	if (!pathObj.protocol) {
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

function getFilenameFromUrl (u) {
	return path.basename(url.parse(u).pathname);
}

module.exports = {
	getUrl: getUrl,
	getUnixPath: getUnixPath,
	getRelativePath: getRelativePath,
	getFilenameFromUrl: getFilenameFromUrl
};
