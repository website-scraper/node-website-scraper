var _ = require('lodash');
var logger = require('../logger');

var loadHtml = require('./html');
var loadCss = require('./css');
function loadHtmlAndCss (context, resource) {
	return loadHtml(context, resource).then(function loadCssFromHtml (loadedResource) {
		return loadCss(context, loadedResource);
	});
}

function getResourceHandler (options, resource) {
	var depth = resource.getDepth();
	var depthGreaterThanMax = options.maxDepth && depth >= options.maxDepth;

	switch (true) {
		case depthGreaterThanMax:
			logger.info('filtering out ' + resource + ' by depth');
			return _.noop;
		case resource.isCss():
			logger.debug('using css handler for ' + resource);
			return loadCss;
		case resource.isHtml():
			logger.debug('using html+css handler for ' + resource);
			return loadHtmlAndCss;
		default:
			logger.debug('using no handler for ' + resource);
			return _.noop;
	}
}

module.exports = getResourceHandler;
