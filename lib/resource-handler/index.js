var _ = require('lodash');
var logger = require('../logger');
var utils = require('../utils');

var loadHtml = require('./html');
var loadCss = require('./css');
function loadHtmlAndCss (context, resource) {
	return loadHtml(context, resource).then(function loadCssFromHtml (loadedResource) {
		return loadCss(context, loadedResource);
	});
}

var supportedOptions = ['prettifyUrls', 'sources', 'defaultFilename'];

function ResourceHandler (options, context) {
	var self = this;
	self.options = _.pick(options, supportedOptions);
	self.context = context;
}

ResourceHandler.prototype.getResourceHandler = function getResourceHandler (resource) {
	switch (true) {
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


/**
 * Download resource
 * @param PathHandler - class of PathHandler - imgSrcsetTag or CommonTag or CssText
 * @param context
 * @param {Resource} parentResource
 * @param {string} text
 * @param {HtmlData} childResourceHtmlData
 * @returns {Promise}
 */
ResourceHandler.prototype.handleChildrenResources = function handleChildrenResources (PathHandler, context, parentResource, text, childResourceHtmlData) {
	var commonTag = new PathHandler(text);
	var childrenPaths = commonTag.getPaths();
	var pathsToUpdate = [];

	var childrenPromises = childrenPaths.map(function loadChildrenPath (childrenPath) {
		var childResourceUrl = utils.getUrl(parentResource.getUrl(), childrenPath);

		var childResource = parentResource.createChild(childResourceUrl);
		childResource.setHtmlData(childResourceHtmlData);

		return context.requestResource(childResource).then(function updateSrcsetPart (respondedResource) {
			if (respondedResource) {
				parentResource.updateChild(childResource, respondedResource);

				var relativePath = utils.getRelativePath(parentResource.getFilename(), respondedResource.getFilename());
				if (context.options.prettifyUrls) {
					relativePath = relativePath.replace(context.options.defaultFilename, '');
				}
				var hash = utils.getHashFromUrl(childrenPath);

				if (hash && respondedResource.isHtml()) {
					relativePath = relativePath.concat(hash);
				}

				pathsToUpdate.push({ oldPath: childrenPath, newPath: relativePath});

				// Do not wait for loadResource here, to prevent deadlock, see scraper.waitForLoad
				context.loadResource(respondedResource);
			}
			return null; // Prevent Bluebird warnings
		});
	});

	return utils.waitAllFulfilled(childrenPromises).then(function updateChildrenPaths () {
		return commonTag.updateText(pathsToUpdate);
	});
};

ResourceHandler.prototype.handleResource = function handleResource (resource) {
	var self = this;
	var handleResource = self.getResourceHandler(resource);
	var context = {
		options: self.options,
		requestResource: self.context.requestResource.bind(self.context),
		loadResource: self.context.loadResource.bind(self.context),
		handleChildrenResources: self.handleChildrenResources.bind(self)
	};
	return handleResource(context, resource);
};


module.exports = ResourceHandler;
