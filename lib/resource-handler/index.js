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
 * Request all resources from pathContainers paths
 * @param pathContainer - instance of imgSrcsetTag or CommonTag or CssText, contains original paths for resources
 * @param {Resource} parentResource
 * @param {HtmlData} [childResourceHtmlData]
 * @returns {Promise} - resolved when all resources from pathContainer were requested
 * and original paths in parentResource were updated with local paths for children resources
 */
ResourceHandler.prototype.handleChildrenResources = function handleChildrenResources (pathContainer, parentResource, childResourceHtmlData) {
	var self = this;
	var childrenPaths = pathContainer.getPaths();
	var pathsToUpdate = [];

	var childrenPromises = childrenPaths.map(function loadChildPath (childPath) {
		var childResourceUrl = utils.getUrl(parentResource.getUrl(), childPath);

		var childResource = parentResource.createChild(childResourceUrl);
		childResource.setHtmlData(childResourceHtmlData);

		return self.context.requestResource(childResource).then(function updateChildPath (respondedResource) {
			if (respondedResource) {
				parentResource.updateChild(childResource, respondedResource);

				var relativePath = utils.getRelativePath(parentResource.getFilename(), respondedResource.getFilename());
				if (self.options.prettifyUrls) {
					relativePath = relativePath.replace(self.options.defaultFilename, '');
				}
				var hash = utils.getHashFromUrl(childPath);

				if (hash) {
					relativePath = relativePath.concat(hash);
				}

				pathsToUpdate.push({ oldPath: childPath, newPath: relativePath});

				// Do not wait for loadResource here, to prevent deadlock, see scraper.waitForLoad
				self.context.loadResource(respondedResource);
			}
			return null; // Prevent Bluebird warnings
		});
	});

	return utils.waitAllFulfilled(childrenPromises).then(function updateChildrenPaths () {
		return pathContainer.updateText(pathsToUpdate);
	});
};

ResourceHandler.prototype.handleResource = function handleResource (resource) {
	var self = this;
	var handleResource = self.getResourceHandler(resource);
	var context = {
		options: self.options,
		handleChildrenResources: self.handleChildrenResources.bind(self)
	};
	return handleResource(context, resource);
};

module.exports = ResourceHandler;
