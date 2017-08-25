'use strict';

const Promise = require('bluebird');
const PromiseQueue = require('p-queue');
const _ = require('lodash');

const logger = require('./logger');

const defaults = require('./config/defaults');
const recursiveSources = require('./config/recursive-sources');
const Resource = require('./resource');

const FilenameGenerator = require('./filename-generator');
const Request = require('./request');
const ResourceHandler = require('./resource-handler');
const ResourceSaver = require('./resource-saver');
const u = require('./utils');
const NormalizedUrlMap = require('./utils/normalized-url-map');

function Scraper (options) {
	this.options = u.extend(defaults, options);
	this.options.request = u.extend(defaults.request, options.request);
	this.options.urls = Array.isArray(this.options.urls) ? this.options.urls : [this.options.urls];

	if (this.options.subdirectories) {
		this.options.subdirectories.forEach((element) => {
			element.extensions = element.extensions.map((ext) => ext.toLowerCase());
		});
	}

	this.options.recursiveSources = recursiveSources;
	if (this.options.recursive) {
		this.options.sources = u.union(this.options.sources, this.options.recursiveSources);
	}

	logger.info('init with options', this.options);

	this.request = new Request(this.options);
	this.resourceHandler = new ResourceHandler(this.options, this);
	this.filenameGenerator = new FilenameGenerator(this.options);
	this.resourceSaver = this.options.resourceSaver ? new this.options.resourceSaver(u.clone(this.options)) : new ResourceSaver(this.options);

	// Array of Resources for downloading
	this.resources = this.options.urls.map((obj) => {
		const url = (obj && obj.url) ? obj.url : obj;
		const filename = (obj && obj.filename) ? obj.filename : this.options.defaultFilename;
		return new Resource(url, filename);
	});

	this.requestedResourcePromises = new NormalizedUrlMap(); // Map url -> request promise
	this.loadedResources = new NormalizedUrlMap(); // Map url -> resource
	this.requestQueue = new PromiseQueue({concurrency: this.options.requestConcurrency});
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
			return self.resourceSaver.saveResource(resource);
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
			return self.requestQueue.add(() => self.request.get(url, referer));
		}).then(function requestCompleted (responseData) {

			if (!u.urlsEqual(responseData.url, url)) { // Url may be changed in redirects
				logger.debug('url changed. old url = ' + url + ', new url = ' + responseData.url);

				if (self.requestedResourcePromises.has(responseData.url)) {
					return self.requestedResourcePromises.get(responseData.url);
				}

				resource.setUrl(responseData.url);
				self.requestedResourcePromises.set(responseData.url, requestPromise);
			}

			resource.setType(u.getTypeByMime(responseData.mimeType));

			const filename = self.filenameGenerator.generateFilename(resource);
			resource.setFilename(filename);

			// if type was not determined by mime we can try to get it from filename after it was generated
			if (!resource.getType()) {
				resource.setType(u.getTypeByFilename(filename));
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
	const url = resource.getUrl();

	if (this.options.urlFilter && !this.options.urlFilter(url)) {
		logger.debug('filtering out ' + resource + ' by url filter');
		return Promise.resolve(null);
	}

	if (this.options.maxDepth && resource.getDepth() > this.options.maxDepth) {
		logger.debug('filtering out ' + resource + ' by depth');
		return Promise.resolve(null);
	}

	if (this.requestedResourcePromises.has(url)) {
		logger.debug('found requested resource for ' + resource);
		return this.requestedResourcePromises.get(url);
	}

	return this.createNewRequest(resource);
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
	const resourcesToSave = Array.from(this.loadedResources.values()).filter((r) => !r.isSaved());
	const loadingIsFinished = _.isEmpty(resourcesToSave);

	if (!loadingIsFinished) {
		return Promise
			.mapSeries(resourcesToSave, this.saveResource.bind(this))
			.then(this.waitForLoad.bind(this));
	}
	logger.info('downloading is finished successfully');
	return Promise.resolve(this.resources);
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
	return this.resourceSaver.errorCleanup(error).then(() => {
		return Promise.reject(error);
	});
};

Scraper.prototype.scrape = function scrape (callback) {
	return Promise.bind(this)
		.then(this.load)
		.catch(this.errorCleanup)
		.asCallback(callback);
};

Scraper.defaults = u.clone(defaults);

module.exports = Scraper;
