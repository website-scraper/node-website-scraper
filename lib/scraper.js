var Promise = require('bluebird');
var _ = require('lodash');

var logger = require('./logger');

var defaults = require('./config/defaults');
var recursiveSources = require('./config/recursive-sources');
var Resource = require('./resource');

var getFilenameGenerator = require('./filename-generators');
var makeRequest = require('./request');
var getResourceHandler = require('./file-handlers');
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
	self.getResourceHandler = getResourceHandler.bind(null, _.pick(self.options, ['maxDepth']));
	self.generateFilename = getFilenameGenerator(self.options.filenameGenerator);
	self.fsAdapter = new FSAdapter(_.pick(self.options, ['directory']));

	// Custom structures
	// Array of Resources for downloading
	self.originalResources = _.map(self.options.urls, function createResource (obj) {
		var url = _.isObject(obj) && _.has(obj, 'url') ? obj.url : obj;
		var filename = _.isObject(obj) && _.has(obj, 'filename') ? obj.filename : self.options.defaultFilename;
		return new Resource(url, filename);
	});

	self.occupiedFileNames = []; // Array of unavailable filenames
	self.respondedResourcePromises = {}; // Map url -> request promise
	self.loadedResources = {};    // Map url -> resource
}

Scraper.prototype.addOccupiedFileName = function addOccupiedFileName (filename) {
	this.occupiedFileNames.push(filename);
};

Scraper.prototype.getOccupiedFileNames = function getOccupiedFileNames () {
	return this.occupiedFileNames;
};

Scraper.prototype.addRespondedResourcePromise = function addRespondedResourcePromise (url, promise) {
	this.respondedResourcePromises[utils.normalizeUrl(url)] = promise;
};

Scraper.prototype.getRespondedResourcePromise = function getRespondedResourcePromise (url) {
	return this.respondedResourcePromises[utils.normalizeUrl(url)];
};

Scraper.prototype.addLoadedResource = function addLoadedResourcePromise (url, promise) {
	this.loadedResources[utils.normalizeUrl(url)] = promise;
};

Scraper.prototype.getLoadedResource = function getLoadedResourcePromise (url) {
	return this.loadedResources[utils.normalizeUrl(url)];
};

Scraper.prototype.getHtmlSources = function getHtmlSources () {
	return this.options.sources;
};

Scraper.prototype.loadResource = function loadResource (resource) {
	var self = this;
	var url = resource.getUrl();

	var loadedResource = self.getLoadedResource(url);
	if (loadedResource) {
		logger.debug('found loaded resource for ' + resource);
	} else {
		logger.debug('start loading resource ' + resource);
		self.addLoadedResource(url, resource);
	}
};

Scraper.prototype.saveResource = function saveResource (resource) {
	var self = this;
	resource.setSaved();

	return Promise.resolve()
		.then(function handleResource () {
			var resourceHandler = self.getResourceHandler(resource);
			return resourceHandler(self, resource);
		}).then(function fileHandled () {
			logger.info('saving resource ' + resource + ' to fs');
			return self.fsAdapter.saveResource(resource);
		}).catch(function handleError (err) {
			logger.warn('failed to save resource ' + resource);
			return self.handleError(err);
		});
};

Scraper.prototype.requestResource = function requestResource (resource) {
	var self = this;
	var url = resource.getUrl();

	if (!self.options.urlFilter(url)) {
		logger.debug('filtering out ' + resource + ' by url filter');
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
				var respondedNewUrlResource = self.getRespondedResourcePromise(responseData.url);
				if (respondedNewUrlResource) {
					return respondedNewUrlResource;
				}
				resource.setUrl(responseData.url);
				self.addRespondedResourcePromise(responseData.url, respondedResourcePromise);
			}

			var filename = self.generateFilename(resource, self.options, self.getOccupiedFileNames());
			resource.setFilename(filename);
			self.addOccupiedFileName(filename);

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
		}).then(self.waitForLoad.bind(self));
	});
};

// Returns a promise which gets resolved when all resources are loaded.
// 1. Get all not saved resources and save them
// 2. Recursion if any new not saved resource were added during this time. If not, loading is done.
Scraper.prototype.waitForLoad = function waitForLoad () {
	var self = this;
	var resourcesToSave = _.filter(self.loadedResources, function getNotSaved (r) { return !r.isSaved(); });
	var loadingIsFinished = _.isEmpty(resourcesToSave);

	if (!loadingIsFinished) {
		return Promise.mapSeries(resourcesToSave, self.saveResource.bind(self))
			.then(self.waitForLoad.bind(self));
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
