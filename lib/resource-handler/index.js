var _ = require('lodash');
var Promise = require('bluebird');
var logger = require('../logger');
var utils = require('../utils');

var HtmlHandler = require('./html');
var CssHandler = require('./css');

var supportedOptions = ['prettifyUrls', 'sources', 'recursiveSources', 'maxRecursiveDepth', 'defaultFilename'];

function ResourceHandler (options, context) {
	this.options = _.pick(options, supportedOptions);
	this.context = context;

	this.htmlHandler = new HtmlHandler(this.options, this.handleChildrenResources.bind(this));
	this.cssHandler = new CssHandler(this.options, this.handleChildrenResources.bind(this));
}

ResourceHandler.prototype.getResourceHandler = function getResourceHandler (resource) {
	switch (true) {
		case resource.isCss():
			logger.debug('using css handler for ' + resource);
			return this.cssHandler;
		case resource.isHtml():
			logger.debug('using html handler for ' + resource);
			return this.htmlHandler;
		default:
			logger.debug('using no handler for ' + resource);
			return null;
	}
};

/**
 * Request all resources from pathContainers paths
 * @param pathContainer - instance of ImgSrcsetTag or CommonTag or CssText, contains original paths for resources
 * @param {Resource} parentResource
 * @returns {Promise} - resolved when all resources from pathContainer were requested
 * and original paths in parentResource were updated with local paths for children resources
 */
ResourceHandler.prototype.handleChildrenResources = function handleChildrenResources (pathContainer, parentResource) {
	var self = this;
	var childrenPaths = pathContainer.getPaths();
	var pathsToUpdate = [];

	var childrenPromises = childrenPaths.map(function loadChildPath (childPath) {
		var childResourceUrl = utils.getUrl(parentResource.getUrl(), childPath);
		var childResource = parentResource.createChild(childResourceUrl);

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
			}
			return null; // Prevent Bluebird warnings
		});
	});

	return utils.waitAllFulfilled(childrenPromises).then(function updateChildrenPaths () {
		return pathContainer.updateText(pathsToUpdate);
	});
};

ResourceHandler.prototype.handleResource = function handleResource (resource) {
	var resourceHandler = this.getResourceHandler(resource);
	if (resourceHandler && resourceHandler.handle) {
		return resourceHandler.handle(resource);
	}
	return Promise.resolve(resource);
};

module.exports = ResourceHandler;
