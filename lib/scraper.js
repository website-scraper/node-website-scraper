var Promise = require('bluebird');
var _ = require('lodash');

var logger = require('./logger');

var defaults = require('./config/defaults');
var recursiveSources = require('./config/recursive-sources');
var Resource = require('./resource');

var FilenameGenerator = require('./filename-generator');
var makeRequest = require('./request');
var ResourceHandler = require('./resource-handler');
var FSAdapter = require('./fs-adaper');
var utils = require('./utils');

function Scraper (options) {
	var self = this;

	// Extend options
	self.options = _.extend({}, defaults, options);
	self.options.request = _.extend({}, defaults.request, options.request);
	self.options.urls = _.isArray(self.options.urls) ? self.options.urls : [self.options.urls];

	if (self.options.recursive) {
		self.options.sources = _.union(self.options.sources, recursiveSources);
	}

	self.makeRequest = makeRequest.bind(null, self.options.request);
	self.resourceHandler = new ResourceHandler(self.options, self);
	self.filenameGenerator = new FilenameGenerator(self.options);
	self.fsAdapter = new FSAdapter(self.options);

	// Custom structures
	// Array of Resources for downloading
	self.originalResources = _.map(self.options.urls, function createResource (obj) {
		var url = _.isObject(obj) && _.has(obj, 'url') ? obj.url : obj;
		var filename = _.isObject(obj) && _.has(obj, 'filename') ? obj.filename : self.options.defaultFilename;
		return new Resource(url, filename);
	});

	self.respondedResourcePromises = {}; // Map url -> request promise
	self.loadedResourcePromises = {};    // Map url -> save-to-fs promise
}

Scraper.prototype.addRespondedResourcePromise = function addRespondedResourcePromise (url, promise) {
	this.respondedResourcePromises[utils.normalizeUrl(url)] = promise;
};

Scraper.prototype.getRespondedResourcePromise = function getRespondedResourcePromise (url) {
	return this.respondedResourcePromises[utils.normalizeUrl(url)];
};

Scraper.prototype.addLoadedResourcePromise = function addLoadedResourcePromise (url, promise) {
	this.loadedResourcePromises[utils.normalizeUrl(url)] = promise;
};

Scraper.prototype.getLoadedResourcePromise = function getLoadedResourcePromise (url) {
	return this.loadedResourcePromises[utils.normalizeUrl(url)];
};

Scraper.prototype.loadResource = function loadResource (resource) {
	var self = this;
	var url = resource.getUrl();

	var loadedResourcePromise = self.getLoadedResourcePromise(url);
	if (loadedResourcePromise) {
		logger.debug('found loaded resource for ' + resource);
	} else {
		logger.debug('start loading resource ' + resource);
		loadedResourcePromise = Promise.resolve()
			.then(function handleResource () {
				return self.resourceHandler.handleResource(resource);
			}).then(function fileHandled () {
				return self.fsAdapter.saveResource(resource);
			}).catch(function handleError (err) {
				logger.warn('failed to save resource ' + resource);
				return self.handleError(err);
			});

		self.addLoadedResourcePromise(url, loadedResourcePromise);
	}

	return loadedResourcePromise;
};

Scraper.prototype.requestResource = function requestResource (resource) {
	var self = this;
	var url = resource.getUrl();

	if (!self.options.urlFilter(url)) {
		logger.info('filtering out ' + resource + ' by url filter');
		return Promise.resolve(null);
	}

	if (self.options.maxDepth && resource.getDepth() > self.options.maxDepth) {
		logger.info('filtering out ' + resource + ' by depth');
		return Promise.resolve(null);
	}

	var respondedResourcePromise = self.getRespondedResourcePromise(url);
	if (respondedResourcePromise) {
		logger.debug('found responded resource for ' + resource);
		return respondedResourcePromise;
	}

	respondedResourcePromise = Promise.resolve()
		.then(function makeRequest () {
			logger.debug('requesting ' + url);
			return self.makeRequest(url);
		}).then(function requestCompleted (responseData) {
			logger.debug('received response for ' + url);

			if (!utils.urlsEqual(responseData.url, url)) { // Url may be changed in redirects
				logger.debug('url changed. old url = ' + url + ', new ulr = ' + responseData.url);
				resource.setUrl(responseData.url);
				self.addRespondedResourcePromise(responseData.url, respondedResourcePromise);
			}

			var filename = self.filenameGenerator.generateFilename(resource);
			resource.setFilename(filename);

			resource.setText(responseData.body);

			logger.debug('finish request for ' + resource);
			return resource;
		}).catch(function handleError (err) {
			logger.warn('failed to request resource ' + resource);
			return self.handleError(err);
		});

	self.addRespondedResourcePromise(url, respondedResourcePromise);

	return respondedResourcePromise;
};

Scraper.prototype.validate = function validate () {
	return this.fsAdapter.validateDirectory();
};

Scraper.prototype.load = function load () {
	var self = this;
	return self.fsAdapter.createDirectory().then(function loadAllResources () {
		return Promise.map(self.originalResources, function loadResource (originalResource) {
			return self.requestResource(originalResource).then(function receivedResponse (resOriginalResource) {
				// Do not wait for loadResource here, to prevent deadlock, scraper.waitForLoad
				self.loadResource(resOriginalResource);
			});
		}).then(function afterAllOriginalResourcesResponded () {
			return self.waitForLoad(0);
		});
	});
};

// Returns a promise which gets resolved when all resources are loaded.
// Determines whether loading is done by:
// 1. Waiting until all loadedResourcePromises are resolved.
// 2. Recursing itself if any new loadedResourcePromises (promises for the loading of childResources) where added during this time. If not, loading is done.
Scraper.prototype.waitForLoad = function waitForLoad (previousCount) {
	var self = this;
	var count = _.size(self.loadedResourcePromises);
	var loadingIsFinished = (count === previousCount);

	if (!loadingIsFinished) {
		return Promise.all(_.toArray(self.loadedResourcePromises)).then(self.waitForLoad.bind(self, count));
	}
	return Promise.resolve(self.originalResources);
};

Scraper.prototype.handleError = function handleError (err) {
	if (this.options.ignoreErrors) {
		logger.warn('ignoring error: ' + err.message);
		return Promise.resolve(null);
	}
	return Promise.reject(err);
};

Scraper.prototype.errorCleanup = function errorCleanup (error) {
	logger.error('finishing with error: ' + error.message);
	return this.fsAdapter.cleanDirectory().then(function loadedDataRemoved () {
		return Promise.reject(error);
	});
};

Scraper.prototype.scrape = function scrape (callback) {
	var self = this;
	return Promise.bind(self)
		.then(self.validate)
		.then(self.load)
		.catch(self.errorCleanup)
		.asCallback(callback);
};

module.exports = Scraper;
