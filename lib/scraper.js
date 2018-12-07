const Promise = require('bluebird');
const PromiseQueue = require('p-queue');

const logger = require('./logger');

const defaults = require('./config/defaults');
const recursiveSources = require('./config/recursive-sources');
const Resource = require('./resource');

const request = require('./request');
const ResourceHandler = require('./resource-handler');
const {
	SaveResourceToFileSystemPlugin,
	GenerateFilenameBySiteStructurePlugin,
	GenerateFilenameByTypePlugin,
	GetResourceReferencePlugin
} = require('./plugins');

const utils = require('./utils');
const { extend, clone, union, urlsEqual, getTypeByMime, getTypeByFilename } = utils;
const NormalizedUrlMap = require('./utils/normalized-url-map');

const actionNames = [
	'beforeStart', 'afterFinish', 'error',
	'beforeRequest', 'afterResponse',
	'onResourceSaved', 'onResourceError',
	'generateFilename',
	'getReference',
	'saveResource',
];

const mandatoryActions = [
	{ name: 'saveResource', pluginClass: SaveResourceToFileSystemPlugin },
	{ name: 'generateFilename', pluginClass: GenerateFilenameByTypePlugin },
	{ name: 'getReference', pluginClass: GetResourceReferencePlugin },
];

const filenameGeneratorPlugins = {
	byType: GenerateFilenameByTypePlugin,
	bySiteStructure: GenerateFilenameBySiteStructurePlugin
};

class Scraper {
	constructor (options) {
		this.normalizeOptions(options);
		logger.info('init with options', this.options);

		this.applyPlugins(this.options.plugins);

		this.resourceHandler = new ResourceHandler(this.options, {
			requestResource: this.requestResource.bind(this),
			getReference: this.runActions.bind(this, 'getReference')
		});
		this.resources = this.options.urls.map(({url, filename}) => new Resource(url, filename));

		this.requestedResourcePromises = new NormalizedUrlMap(); // Map url -> request promise
		this.loadedResources = new NormalizedUrlMap(); // Map url -> resource
		this.requestQueue = new PromiseQueue({concurrency: this.options.requestConcurrency});
	}

	normalizeOptions (options) {
		this.options = extend(defaults, options);
		this.options.request = extend(defaults.request, options.request);

		const urls = Array.isArray(options.urls) ? options.urls : [options.urls];

		this.options.urls = urls.map((urlItem) => {
			if (typeof urlItem === 'string') {
				return { url: urlItem, filename: this.options.defaultFilename };
			} else {
				return {url: urlItem.url, filename: urlItem.filename || this.options.defaultFilename};
			}
		});

		if (this.options.subdirectories) {
			this.options.subdirectories.forEach((element) => {
				element.extensions = element.extensions.map((ext) => ext.toLowerCase());
			});
		}

		this.options.recursiveSources = recursiveSources;
		if (this.options.recursive) {
			this.options.sources = union(this.options.sources, this.options.recursiveSources);
		}

		this.options.plugins = this.options.plugins || [];

		if (Object.keys(filenameGeneratorPlugins).includes(this.options.filenameGenerator)) {
			this.options.plugins.unshift(new filenameGeneratorPlugins[this.options.filenameGenerator]());
		}
	}

	applyPlugins (plugins = []) {
		this.actions = {};
		actionNames.forEach(actionName => this.actions[actionName] = []);
		plugins.forEach(plugin => {
			logger.debug(`[plugin] apply plugin ${plugin.constructor.name}`);
			plugin.apply(this.addAction.bind(this));
		});

		mandatoryActions.forEach(mandatoryAction => {
			if (this.actions[mandatoryAction.name].length === 0) {
				const plugin = new mandatoryAction.pluginClass();
				logger.debug(`[plugin] apply default plugin ${plugin.constructor.name} for action ${mandatoryAction.name}`);
				plugin.apply(this.addAction.bind(this));
			}
		});
	}

	addAction (name, handler) {
		if (!actionNames.includes(name)) {
			throw new Error(`Unknown action "${name}"`);
		}
		logger.debug(`add action ${name}`);
		this.actions[name].push(handler);
	}

	loadResource (resource) {
		const url = resource.getUrl();

		if (this.loadedResources.has(url)) {
			logger.debug('found loaded resource for ' + resource);
		} else {
			logger.debug('add loaded resource ' + resource);
			this.loadedResources.set(url, resource);
		}
	}

	async saveResource (resource) {
		resource.setSaved();

		try {
			await this.resourceHandler.handleResource(resource);
			logger.info('saving resource ' + resource + ' to fs');
			await this.runActions('saveResource', {resource});
			// ignore promise here, just notifying external code about resource saved
			this.runActions('onResourceSaved', {resource});
		} catch (err) {
			logger.warn('failed to save resource ' + resource);
			await this.handleError(err, resource);
		}
	}

	createNewRequest (resource) {
		const self = this;
		const url = resource.getUrl();

		const requestPromise = Promise.resolve()
			.then(async () => {
				const referer = resource.parent ? resource.parent.getUrl() : null;
				const {requestOptions} = await this.runActions('beforeRequest', {resource, requestOptions: this.options.request});
				return this.requestQueue.add(() => request.get({
					url,
					referer,
					options: requestOptions,
					afterResponse: this.actions.afterResponse.length ? this.runActions.bind(this, 'afterResponse') : undefined
				}));
			}).then(async function requestCompleted (responseData) {
				if (!responseData) {
					logger.debug('no response returned for url ' + url);
					return null;
				}

				if (!urlsEqual(responseData.url, url)) { // Url may be changed in redirects
					logger.debug('url changed. old url = ' + url + ', new url = ' + responseData.url);

					if (self.requestedResourcePromises.has(responseData.url)) {
						return self.requestedResourcePromises.get(responseData.url);
					}

					resource.setUrl(responseData.url);
					self.requestedResourcePromises.set(responseData.url, requestPromise);
				}

				resource.setType(getTypeByMime(responseData.mimeType));

				const { filename } = await self.runActions('generateFilename', { resource });
				resource.setFilename(filename);

				// if type was not determined by mime we can try to get it from filename after it was generated
				if (!resource.getType()) {
					resource.setType(getTypeByFilename(filename));
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
	}

	async requestResource (resource) {
		const url = resource.getUrl();

		if (this.options.urlFilter && !this.options.urlFilter(url)) {
			logger.debug('filtering out ' + resource + ' by url filter');
			return null;
		}

		if (this.options.maxDepth && resource.getDepth() > this.options.maxDepth) {
			logger.debug('filtering out ' + resource + ' by depth');
			return null;
		}

		if (this.requestedResourcePromises.has(url)) {
			logger.debug('found requested resource for ' + resource);
			return this.requestedResourcePromises.get(url);
		}

		return this.createNewRequest(resource);
	}

	async runActions (actionName, params) {
		logger.debug(`run ${this.actions[actionName].length} actions ${actionName}`);

		let result = extend(params);
		for (let action of this.actions[actionName]) {
			if (typeof action === 'function') {
				result = await action(extend(params, result));
			}
		}
		return result;
	}

	async load () {
		return Promise
			.map(this.resources, this.requestResource.bind(this))
			.then(this.waitForLoad.bind(this));
	}

	// Returns a promise which gets resolved when all resources are loaded.
	// 1. Get all not saved resources and save them
	// 2. Recursion if any new not saved resource were added during this time. If not, loading is done.
	waitForLoad () {
		const resourcesToSave = Array.from(this.loadedResources.values()).filter((r) => !r.isSaved());
		const loadingIsFinished = resourcesToSave.length === 0;

		if (!loadingIsFinished) {
			return Promise
				.mapSeries(resourcesToSave, this.saveResource.bind(this))
				.then(this.waitForLoad.bind(this));
		}
		logger.info('downloading is finished successfully');
		return Promise.resolve(this.resources);
	}

	async handleError (err, resource) {
		// ignore promise here, just notifying external code about resource error
		this.runActions('onResourceError', {resource, error: err});

		if (this.options.ignoreErrors) {
			logger.warn('ignoring error: ' + err.message);
			return null;
		}
		throw err;
	}

	async errorCleanup (error) {
		logger.error('finishing with error: ' + error.message);
		await this.runActions('error', {error});
		throw error;
	}

	scrape (callback) {
		return Promise.bind(this)
			.then(() => this.runActions('beforeStart', {options: this.options, utils}))
			.then(this.load)
			.catch(this.errorCleanup)
			.finally(() => this.runActions('afterFinish'))
			.asCallback(callback);
	}
}

Scraper.defaults = clone(defaults);
Scraper.plugins = {
	SaveResourceToFileSystemPlugin,
	GenerateFilenameByTypePlugin,
	GenerateFilenameBySiteStructurePlugin
};

module.exports = Scraper;
