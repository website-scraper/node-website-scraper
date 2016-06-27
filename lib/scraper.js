var Promise = require('bluebird');

var fs = require('fs-extra');
var existsAsync = Promise.promisify(fs.stat);
var outputFileAsync = Promise.promisify(fs.outputFile);
var ensureDirAsync = Promise.promisify(fs.ensureDir);

var path = require('path');
var _ = require('lodash');

var defaults = require('./config/defaults');
var recursiveSources = require('./config/recursive-sources');
var Resource = require('./resource');

var getFilenameGenerator = require('./filename-generators/filename-generator-getter');
var makeRequest = require('./request');
var normalizeUrl = require('normalize-url');

var loadHtml = require('./file-handlers/html');
var loadCss = require('./file-handlers/css');
function loadHtmlAndCss (context, po) {
	return loadHtml(context, po).then(function loadCssFromHtml (loaded) {
		return loadCss(context, loaded);
	});
}

function Scraper (options) {
	this.originalResources = [];
	this.occupiedFileNames = [];
	this.loadedResources = [];
	this.respondedResourcePromises = {};
	this.loadedResourcePromises = {};

	this.options = _.extend({}, defaults, options);
	this.options.request = _.extend({}, defaults.request, options.request);
	this.options.directory = path.resolve(process.cwd(), this.options.directory || '');
	this.options.filenameGenerator = getFilenameGenerator(this.options.filenameGenerator);
}

Scraper.prototype.addOccupiedFileName = function addOccupiedFileName (filename) {
	this.occupiedFileNames.push(filename);
};

Scraper.prototype.getOccupiedFileNames = function getOccupiedFileNames () {
	return this.occupiedFileNames;
};

Scraper.prototype.addLoadedResource = function addLoadedResource (resource) {
	this.loadedResources.push(resource);
};

Scraper.prototype.addRespondedResourcePromise = function addRespondedResourcePromise (url, promise) {
	url = normalizeUrl(url);
	this.respondedResourcePromises[url] = promise;
};

Scraper.prototype.getRespondedResourcePromise = function getRespondedResourcePromise (url) {
	url = normalizeUrl(url);
	return this.respondedResourcePromises[url];
};

Scraper.prototype.addLoadedResourcePromise = function addLoadedResourcePromise (url, promise) {
	url = normalizeUrl(url);
	this.loadedResourcePromises[url] = promise;
};

Scraper.prototype.getLoadedResourcePromise = function getLoadedResourcePromise (url) {
	url = normalizeUrl(url);
	return this.loadedResourcePromises[url];
};

Scraper.prototype.getHtmlSources = function getHtmlSources () {
	return this.options.sources;
};

Scraper.prototype.getResourceHandler = function getHandler (resource) {
	var self = this;
	var depth = resource.getDepth();
	var depthGreaterThanMax = self.options.maxDepth && depth >= self.options.maxDepth;

	switch(true) {
		case depthGreaterThanMax:
			return _.noop;
		case resource.isCss():
			return loadCss;
		case resource.isHtml():
			return loadHtmlAndCss;
		default:
			return _.noop;
	}
};

Scraper.prototype.loadResource = function loadResource (resource) {
	var self = this;
	var url = resource.getUrl();

	if(!self.options.urlFilter(url)) {
		return Promise.resolve(null);
	}

	var loadedResourcePromise = self.getLoadedResourcePromise(url);
	if(loadedResourcePromise) {
		return loadedResourcePromise;
	}

	var respondedResourcePromise = self.requestResource(resource);

	loadedResourcePromise = respondedResourcePromise.then(function handleResponse (resource) {
		return Promise.resolve()
			.then(function handleResource () {
				var resourceHandler = self.getResourceHandler(resource);
				return resourceHandler(self, resource);
			}).then(function fileHandled () {
				var filename = path.join(self.options.directory, resource.getFilename());
				var text = resource.getText();
				return outputFileAsync(filename, text, { encoding: 'binary' });
			}).then(function fileSaved () {
				self.addLoadedResourcePromise(resource.getUrl(), loadedResourcePromise);
				self.addLoadedResource(resource);
				return resource;
			});
	});
	self.addLoadedResourcePromise(url, loadedResourcePromise);

	return loadedResourcePromise;
};

Scraper.prototype.requestResource = function requestResource (resource) {
	var self = this;
	var url = resource.getUrl();

	if(!self.options.urlFilter(url)) {
		return Promise.resolve(null);
	}

	var respondedResourcePromise = self.getRespondedResourcePromise(url);
	if(respondedResourcePromise) {
		return respondedResourcePromise;
	}

	var promise = self.makeRequest(url).then(function requestCompleted (data) {
		// Url may be changed in redirects
		resource.setUrl(data.url);
		
		var filename = self.options.filenameGenerator(resource, self.options, self.getOccupiedFileNames());
		resource.setFilename(filename);
		self.addOccupiedFileName(filename);
		self.addRespondedResourcePromise(data.url, promise);

		resource.setText(data.body);
		return resource;
	});
	self.addRespondedResourcePromise(url, promise);

	return promise;
};

Scraper.prototype.validate = function validate () {
	var dir = this.options.directory;
	return existsAsync(dir).then(function handleDirectoryExist () {
		return Promise.reject(new Error('Path ' + dir + ' exists'));
	}, function handleDirectoryNotExist () {
		return Promise.resolve();
	});
};

Scraper.prototype.prepare = function prepare () {
	var self = this;

	// Create makeRequest function with custom request params
	self.makeRequest = makeRequest.bind(null, self.options.request);

	// Create array of Resource for downloading
	self.options.urls = _.isArray(self.options.urls) ? self.options.urls : [self.options.urls];
	self.originalResources = _.map(self.options.urls, function createResource (obj) {
		var url = _.isObject(obj) && _.has(obj, 'url') ? obj.url : obj;
		var filename = _.isObject(obj) && _.has(obj, 'filename') ? obj.filename : self.options.defaultFilename;
		return new Resource(url, filename);
	});

	if(self.options.recursive) {
		self.options.sources = _.union(self.options.sources, recursiveSources);
	}

	return ensureDirAsync(self.options.directory);
};

Scraper.prototype.load = function load () {
	var self = this;
	_.forEach(self.originalResources, function loadResource (resource) {
		self.loadResource(resource);
	});
	return self.waitForLoad(0);
};

// Returns a promise which gets resolved when all resources are loaded.
// Determines whether loading is done by:
// 1. Waiting until all loadedResourcePromises are resolved.
// 2. Recursing itself if any new loadedResourcePromises (promises for the loading of childResources) where added during this time. If not, loading is done.
Scraper.prototype.waitForLoad = function waitForLoad (previousCount) {
	var self = this;
	var count = _.size(self.loadedResourcePromises);
	if(count === previousCount) {
		return Promise.all(_.map(self.originalResources, function getLoadedResource (resource) {
			return self.getLoadedResourcePromise(resource.getUrl());
		}));
	} else{
		return Promise
			.all(_.toArray(self.loadedResourcePromises))
			.then(self.waitForLoad.bind(self, count));
	}
};

Scraper.prototype.errorCleanup = function errorCleanup (error) {
	if (!_.isEmpty(this.loadedResources)) {
		fs.removeSync(this.options.directory);
	}
	throw error;
};

Scraper.prototype.scrape = function scrape (callback) {
	var self = this;
	return Promise.bind(self)
		.then(self.validate)
		.then(self.prepare)
		.then(self.load)
		.catch(self.errorCleanup)
		.asCallback(callback);
};

module.exports = Scraper;
