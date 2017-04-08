'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const logger = require('./logger');

const defaults = require('./config/defaults');
const recursiveSources = require('./config/recursive-sources');
const Resource = require('./resource');

const FilenameGenerator = require('./filename-generator');
const Request = require('./request');
const ResourceHandler = require('./resource-handler');
const FSAdapter = require('./fs-adaper');
const utils = require('./utils');
const NormalizedUrlMap = require('./utils/normalized-url-map');

function Scraper (options) {
	const self = this;

	self.options = Object.assign({}, defaults, options);
	self.options.request = Object.assign({}, defaults.request, options.request);
	self.options.urls = Array.isArray(self.options.urls) ? self.options.urls : [self.options.urls];

	if (self.options.subdirectories) {
		self.options.subdirectories.forEach((element) => {
			element.extensions = element.extensions.map((ext) => ext.toLowerCase());
		});
	}

	if (self.options.recursive) {
		self.options.sources = _.union(self.options.sources, recursiveSources);
	}

	logger.info('init with options', self.options);

	self.request = new Request(self.options);
	self.resourceHandler = new ResourceHandler(self.options, self);
	self.filenameGenerator = new FilenameGenerator(self.options);
	self.fsAdapter = self.options.fsAdapter ? new self.options.fsAdapter(self.options) : new FSAdapter(self.options);

	// Custom structures
	// Array of Resources for downloading
	self.resources = self.options.urls.map((obj) => {
		const url = (obj && obj.url) ? obj.url : obj;
		const filename = (obj && obj.filename) ? obj.filename : self.options.defaultFilename;
		return new Resource(url, filename);
	});

	self.requestedResourcePromises = new NormalizedUrlMap(); // Map url -> request promise
	self.loadedResources = new NormalizedUrlMap(); // Map url -> resource
}

Scraper.prototype.loadResource = function loadResource (resource) {
	const url = resource.getUrl();

	if (this.loadedResources.has(url)) {
		logger.debug('found loaded resource for ' + resource);
	} else {
		logger.debug('add loaded resource ' + resource);
		this.loadedResources.set(url, resource);
	}
};

Scraper.prototype.saveResource = function saveResource (resource) {
	const self = this;
	resource.setSaved();

	return Promise.resolve()
		.then(function handleResource () {
			return self.resourceHandler.handleResource(resource);
		}).then(function fileHandled () {
			logger.info('saving resource ' + resource + ' to fs');
			return self.fsAdapter.saveResource(resource);
		}).then(function afterResourceSaved () {
			if (self.options.onResourceSaved) {
				self.options.onResourceSaved(resource);
			}
		}).catch(function handleError (err) {
			logger.warn('failed to save resource ' + resource);
			return self.handleError(err, resource);
		});
};

Scraper.prototype.createNewRequest = function createNewRequest (resource) {
	const self = this;
	const url = resource.getUrl();

	const requestPromise = Promise.resolve()
		.then(function makeRequest () {
			const referer = resource.parent ? resource.parent.getUrl() : null;
			return self.request.get(url, referer);
		}).then(function requestCompleted (responseData) {

			if (!utils.urlsEqual(responseData.url, url)) { // Url may be changed in redirects
				logger.debug('url changed. old url = ' + url + ', new url = ' + responseData.url);

				if (self.requestedResourcePromises.has(responseData.url)) {
					return self.requestedResourcePromises.get(responseData.url);
				}

				resource.setUrl(responseData.url);
				self.requestedResourcePromises.set(responseData.url, requestPromise);
			}

			resource.setType(utils.getTypeByMime(responseData.mimeType));

			const filename = self.filenameGenerator.generateFilename(resource);
			resource.setFilename(filename);

			// if type was not determined by mime we can try to get it from filename after it was generated
			if (!resource.getType()) {
				resource.setType(utils.getTypeByFilename(filename));
			}

			if (responseData.metadata) {
				resource.setMetadata(responseData.metadata);
			}

			resource.setText(responseData.body);
			self.loadResource(resource); // Add resource to list for future downloading, see Scraper.waitForLoad
			return resource;
		}).catch(function handleError (err) {
			logger.warn('failed to request resource ' + resource);
			return self.handleError(err, resource);
		});

	self.requestedResourcePromises.set(url, requestPromise);
	return requestPromise;
};

Scraper.prototype.requestResource = function requestResource (resource) {
	const self = this;
	const url = resource.getUrl();

	if (self.options.urlFilter && !self.options.urlFilter(url)) {
		logger.debug('filtering out ' + resource + ' by url filter');
		return Promise.resolve(null);
	}

	if (self.options.maxDepth && resource.getDepth() > self.options.maxDepth) {
		logger.debug('filtering out ' + resource + ' by depth');
		return Promise.resolve(null);
	}

	if (self.requestedResourcePromises.has(url)) {
		logger.debug('found requested resource for ' + resource);
		return self.requestedResourcePromises.get(url);
	}

	return self.createNewRequest(resource);
};

Scraper.prototype.load = function load () {
	return Promise
		.map(this.resources, this.requestResource.bind(this))
		.then(this.waitForLoad.bind(this));
};

// Returns a promise which gets resolved when all resources are loaded.
// 1. Get all not saved resources and save them
// 2. Recursion if any new not saved resource were added during this time. If not, loading is done.
Scraper.prototype.waitForLoad = function waitForLoad () {
	const self = this;
	const resourcesToSave = Array.from(self.loadedResources.values()).filter((r) => !r.isSaved());
	const loadingIsFinished = _.isEmpty(resourcesToSave);

	if (!loadingIsFinished) {
		return Promise.mapSeries(resourcesToSave, self.saveResource.bind(self))
			.then(self.waitForLoad.bind(self));
	}
	logger.info('downloading is finished successfully');
	return Promise.resolve(self.resources);
};

Scraper.prototype.handleError = function handleError (err, resource) {
	if (resource && this.options.onResourceError) {
		this.options.onResourceError(resource, err);
	}
	if (this.options.ignoreErrors) {
		logger.warn('ignoring error: ' + err.message);
		return Promise.resolve(null);
	}
	return Promise.reject(err);
};

Scraper.prototype.errorCleanup = function errorCleanup (error) {
	logger.error('finishing with error: ' + error.message);
	return this.fsAdapter.removeSavedResources().then(function loadedDataRemoved () {
		return Promise.reject(error);
	});
};

Scraper.prototype.scrape = function scrape (callback) {
	return Promise.bind(this)
		.then(this.load)
		.catch(this.errorCleanup)
		.asCallback(callback);
};

Scraper.defaults = Object.assign({}, defaults);

module.exports = Scraper;
