var _ = require('lodash');
var logger = require('../logger');

var loadHtml = require('./html');
var loadCss = require('./css');
function loadHtmlAndCss (context, resource) {
	return loadHtml(context, resource).then(function loadCssFromHtml (loadedResource) {
		return loadCss(context, loadedResource);
	});
}

var supportedOptions = ['prettifyUrls', 'maxDepth', 'sources', 'defaultFilename'];

function ResourceHandler (options, context) {
	var self = this;
	self.options = _.pick(options, supportedOptions);
	self.context = context;
}

ResourceHandler.prototype.getResourceHandler = function getResourceHandler (resource) {
	var self = this;

	var depth = resource.getDepth();
	var depthGreaterThanMax = self.options.maxDepth && depth >= self.options.maxDepth;

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
};

ResourceHandler.prototype.handleResource = function handleResource (resource) {
	var self = this;
	var handleResource = self.getResourceHandler(resource);
	var context = {
		options: self.options,
		requestResource: self.context.requestResource.bind(self.context),
		loadResource: self.context.loadResource.bind(self.context)
	};
	return handleResource(context, resource);
};

module.exports = ResourceHandler;
