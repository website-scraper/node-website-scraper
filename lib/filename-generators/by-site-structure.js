var url = require('url');
var path = require('path');

module.exports = function generateFilename (resource, options) {
	var urlObject = url.parse(resource.getUrl());
	var extension = path.extname(urlObject.pathname);
	if(resource.isHtml() && !extension){
		var fileName = options.defaultFilename + (urlObject.search || '');
		return getSafeAbsoluteFilename(path.join(urlObject.pathname || '/', fileName));
	}
	else{
		return getSafeAbsoluteFilename(urlObject.pathname);
	}
};

function getSafeAbsoluteFilename (urlPath){
	urlPath = path.normalize(urlPath);

	var safeFileName = urlPath.replace(/\.\./g, '.');
	safeFileName = path.normalize(safeFileName);
	return safeFileName;
}
