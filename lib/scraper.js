var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');
var _ = require('underscore');

var defaults = require('./config/defaults.js');
var utils = require('./utils.js');
var request = require('./request');
var PageObject = require('./page-object');
var loadHtml = require('./file-handlers/html');
var loadCss = require('./file-handlers/css');

function getLoadedPageObject (pageObject) {
	var props = { url: pageObject.getUrl() };
	return _.findWhere(this.loadedPageObjects, props);
}

function addLoadedPageOject (pageObject) {
	this.loadedPageObjects.push(pageObject);
}

function getOccupiedFilenames () {
	return _.chain(this.loadedPageObjects)
		.map(function (o) { return o.getFilename(); })
		.unique()
		.compact()
		.value();
}

function getHtmlSources () {
	return this.options.sources;
}

function generateFilename (pageObject) {
	var self = this;

	var occupiedFilenames = self.getOccupiedFilenames();

	var preferedFilename = pageObject.getFilename();       // which was set in options
	var urlFilename = path.basename(pageObject.getUrl());  // try to get filename from url
	var filename = utils.trimFilename(preferedFilename || urlFilename);

	var ext = path.extname(filename);
	var dir = self.getDirectoryByExtension(ext);
	var currentFilename = path.join(dir, filename);
	var basename = path.basename(filename, ext);
	var index = 1;

	while (_.contains(occupiedFilenames, currentFilename)) {
		currentFilename = path.join(dir, basename + '_' + index + ext);
		index++;
	}
	return currentFilename;
}

function getDirectoryByExtension (ext) {
	return _.chain(this.options.subdirectories)
		.filter(function (dir) { return _.contains(dir.extensions, ext); })
		.map(function (dirObj) { return dirObj.directory; })
		.first()
		.value() || '';
}

function getHandleFunction (pageObject) {
	var type = pageObject.getType();
	switch (type) {
		case 'css': return loadCss;
		case 'html': return function loadHtmlAndCss (context, po) {
			return loadHtml(context, po).then(function (loaded) {
				loadCss(context, loaded);
			});
		};
		default: return _.noop;
	}
}

function loadPageObject (pageObject) {
	var self = this;

	var loaded = self.getLoadedPageObject(pageObject); 	// try to find already loaded PO

	var url = pageObject.getUrl();
	var filename;
	var handleFile;

	if (!loaded) {
		filename = self.generateFilename(pageObject);
		pageObject.setFilename(filename);

		self.addLoadedPageObject(pageObject);

		// Request -> processing -> save to fs
		return self.makeRequest(url).then(function requestCompleted(data) {
			pageObject.setUrl(data.url);  // Url may be changed in redirects
			pageObject.setText(data.body);
			handleFile = getHandleFunction(pageObject);
			return handleFile(self, pageObject);
		}).then(function fileHandled() {
			var filename = path.join(self.options.directory, pageObject.getFilename());
			var text = pageObject.getText();
			return fs.outputFileAsync(filename, text, {encoding: 'binary'});
		}).then(function fileSaved() {
			return Promise.resolve(pageObject);
		});
	}

	return Promise.resolve(loaded);
}

function validate () {
	if (fs.existsSync(this.options.directory)) {
		return Promise.reject(new Error('Path ' + this.options.directory + ' exists'));
	}
	return Promise.resolve();
}

function beforeLoad () {
	var self = this;
	fs.ensureDirSync(self.options.directory);

	// Set static subdirectories as loaded to avoid saving file with subdirectory's name
	_.map(self.options.subdirectories, function (dir) {
		self.addLoadedPageObject(new PageObject(null, dir.directory));
	});

	// Create makeRequest function with custom request params
	self.makeRequest = request.makeRequest.bind(null, self.options.request);

	// Create array of PageObject for downloading
	self.options.urls = _.isArray(self.options.urls) ? self.options.urls : [self.options.urls];

	self.originalPageObjects = _.map(self.options.urls, function createPageObject(obj) {
		var url = _.isObject(obj) && _.has(obj, 'url') ? obj.url : obj;
		var filename = _.isObject(obj) && _.has(obj, 'filename') ? obj.filename : self.options.defaultFilename;

		return new PageObject(url, filename);
	});
	return Promise.resolve();
}

function load () {
	var self = this;
	return Promise.map(self.originalPageObjects, function loadPage (po) {
		return self.loadPageObject(po).then(function pageLoaded (loaded) {
			return Promise.resolve(_.pick(loaded, ['url', 'filename']));
		});
	});
}

function errorCleanup (error) {
	if (!_.isEmpty(this.getOccupiedFilenames())) {
		fs.removeAsync(this.options.directory);
	}
	throw error;
}

function Scraper (options) {
	this.originalPageObjects = [];
	this.loadedPageObjects = [];

	this.options = _.extend({}, defaults, options);
	this.options.directory = path.resolve(process.cwd(), this.options.directory || '');

	this.validate = validate.bind(this);
	this.beforeLoad = beforeLoad.bind(this);
	this.load = load.bind(this);
	this.errorCleanup = errorCleanup.bind(this);

	this.loadPageObject = loadPageObject.bind(this);
	this.getLoadedPageObject = getLoadedPageObject.bind(this);
	this.addLoadedPageObject = addLoadedPageOject.bind(this);
	this.getOccupiedFilenames = getOccupiedFilenames.bind(this);
	this.generateFilename = generateFilename.bind(this);
	this.getDirectoryByExtension = getDirectoryByExtension.bind(this);
	this.getHtmlSources = getHtmlSources.bind(this);
}

Scraper.prototype.scrape = function scrape(callback) {
	var self = this;
	return self.validate()
		.then(self.beforeLoad)
		.then(self.load)
		.catch(self.errorCleanup)
		.nodeify(callback);
};

module.exports = Scraper;
