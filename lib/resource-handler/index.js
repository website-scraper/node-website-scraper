'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const logger = require('../logger');
const utils = require('../utils');

const HtmlHandler = require('./html');
const CssHandler = require('./css');

const supportedOptions = ['prettifyUrls', 'sources', 'recursiveSources', 'maxRecursiveDepth', 'defaultFilename', 'updateMissingSources', 'updateSources'];

class ResourceHandler {
	constructor (options, context) {
		this.options = _.pick(options, supportedOptions);
		this.context = context;

		const methods = {
			downloadChildrenPaths: this.downloadChildrenResources.bind(this),
			updateChildrenPaths: this.updateChildrenResources.bind(this)
		};

		this.htmlHandler = new HtmlHandler(this.options, methods);
		this.cssHandler = new CssHandler(this.options, methods);
	}

	getResourceHandler (resource) {
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
	}

	/**
	 * Request all resources from pathContainers paths
	 * @param pathContainer - instance of ImgSrcsetTag or CommonTag or CssText, contains original paths for resources
	 * @param {Resource} parentResource
	 * @param {boolean} updateIfFailed - if true - failed resources will be updated with absolute links
	 * @returns {Promise} - resolved when all resources from pathContainer were requested
	 * and original paths in parentResource were updated with local paths for children resources
	 */
	downloadChildrenResources (pathContainer, parentResource, updateIfFailed) {
		const self = this;
		const childrenPaths = pathContainer.getPaths();
		const pathsToUpdate = [];

		const childrenPromises = childrenPaths.map((childPath) => {
			const childResourceUrl = utils.getUrl(parentResource.getUrl(), childPath);
			const childResource = parentResource.createChild(childResourceUrl);

			return self.context.requestResource(childResource).then((respondedResource) => {
				if (respondedResource) {
					parentResource.updateChild(childResource, respondedResource);

					let relativePath = utils.getRelativePath(parentResource.getFilename(), respondedResource.getFilename());
					if (self.options.prettifyUrls) {
						if (relativePath === self.options.defaultFilename
							|| relativePath.endsWith('/' + self.options.defaultFilename)) {
							relativePath = relativePath.slice(0, -self.options.defaultFilename.length);
						}
					}
					const hash = utils.getHashFromUrl(childPath);

					if (hash) {
						relativePath = relativePath.concat(hash);
					}

					pathsToUpdate.push({ oldPath: childPath, newPath: relativePath});
				} else {
					if (updateIfFailed) {
						pathsToUpdate.push({ oldPath: childPath, newPath: childResourceUrl});
					}
				}
				return null; // Prevent Bluebird warnings
			});
		});

		return utils.waitAllFulfilled(childrenPromises).then(function updateChildrenPaths () {
			if (self.options.updateSources === false) {
				return pathContainer.updateText([]);
			}
			return pathContainer.updateText(pathsToUpdate);
		});
	}

	updateChildrenResources (pathContainer, parentResource, needToUpdate) {
		if (!needToUpdate || this.options.updateSources === false) {
			return Promise.resolve(pathContainer.updateText([]));
		}
		const parentUrl = parentResource.getUrl();
		const pathsToUpdate = [];
		pathContainer.getPaths().forEach((path) => {
			const childAbsoluteUrl = utils.getUrl(parentUrl, path);
			pathsToUpdate.push({ oldPath: path, newPath: childAbsoluteUrl });
		});
		return Promise.resolve(pathContainer.updateText(pathsToUpdate));
	}

	handleResource (resource) {
		const resourceHandler = this.getResourceHandler(resource);
		if (resourceHandler && resourceHandler.handle) {
			return resourceHandler.handle(resource);
		}
		return Promise.resolve(resource);
	}
}

module.exports = ResourceHandler;
