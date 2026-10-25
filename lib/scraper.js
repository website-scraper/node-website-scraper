import PromiseQueue from 'p-queue';
import logger from './logger.js';
import defaults from './config/defaults.js';
import recursiveSources from './config/recursive-sources.js';
import Resource from './resource.js';
import { RequestError } from 'got';
import request from './request.js';
import ResourceHandler from './resource-handler/index.js';
import {
	SaveResourceToFileSystemPlugin,
	GenerateFilenameBySiteStructurePlugin,
	GenerateFilenameByTypePlugin,
	GetResourceReferencePlugin
} from './plugins/index.js';

import * as utils from './utils/index.js';
const { extend, union, urlsEqual, getTypeByMime, getTypeByFilename, series } = utils;
import { buffer as readStreamToBuffer } from 'stream/consumers';
import NormalizedUrlMap from './utils/normalized-url-map.js';

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
		this.fatalError = null; // first error which should abort the scrape, see Scraper.waitForLoad
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

	async persistResource (resource) {
		resource.setSaved();

		try {
			await this.resourceHandler.handleResource(resource);

			if (resource.contentStream && this.actions.saveResource.length > 1) {
				// live stream can be consumed only once - buffer content (as a Buffer,
				// strings cap at ~512 MiB) so each saveResource action can read it
				resource.setContentBuffer(await readStreamToBuffer(resource.contentStream));
				resource.setContentStream(null);
			}

			logger.info('saving resource ' + resource + ' to fs');
			await this.runSaveResourceActions(resource);
		} finally {
			const stream = resource.contentStream;
			if (stream && !stream.readableEnded) {
				// action resolved without consuming the stream - release the socket
				stream.destroy();
			}
			resource.clearContent();
		}

		// ignore promise here, just notifying external code about resource saved
		this.runActions('onResourceSaved', {resource});
	}

	/*
	 * Runs saveResource actions. For a live stream the save also fails when the stream
	 * itself errors (e.g. connection reset mid-body), so that an action which does not
	 * propagate stream errors (e.g. .pipe() without an error handler) cannot hang the scrape.
	 */
	async runSaveResourceActions (resource) {
		const stream = resource.contentStream;
		if (!stream) {
			return this.runActions('saveResource', {resource});
		}

		let onStreamError;
		const streamFailed = new Promise((resolve, reject) => {
			onStreamError = reject;
			stream.once('error', onStreamError);
		});

		try {
			return await Promise.race([this.runActions('saveResource', {resource}), streamFailed]);
		} finally {
			stream.off('error', onStreamError);
		}
	}

	async saveResource (resource) {
		try {
			await this.persistResource(resource);
		} catch (err) {
			logger.warn('failed to save resource ' + resource);
			await this.handleError(err, resource);
		}
	}

	createNewRequest (resource) {
		const self = this;
		const url = resource.getUrl();

		// the queue task encompasses response headers and full body consumption
		// (buffering for html/css, streaming to storage for other types)
		// so that requestConcurrency bounds concurrent transfers
		const requestPromise = Promise.resolve()
			.then(() => {
				const referer = resource.parent ? resource.parent.getUrl() : null;
				return this.requestQueue.add(async function requestCompleted () {
					const {requestOptions} = await self.runActions('beforeRequest', {resource, requestOptions: self.options.request});
					const responseData = await request.get({
						url,
						referer,
						options: requestOptions,
						afterResponse: self.actions.afterResponse.length ? self.runActions.bind(self, 'afterResponse') : undefined
					});

					if (!responseData) {
						logger.debug('no response returned for url ' + url);
						return null;
					}

					if (!urlsEqual(responseData.url, url)) { // Url may be changed in redirects
						logger.debug('url changed. old url = ' + url + ', new url = ' + responseData.url);

						if (self.requestedResourcePromises.has(responseData.url)) {
							responseData.stream.destroy(); // duplicate of an already requested resource - release the socket
							// awaiting the other resource's promise here would deadlock at low concurrency
							// because it may still be waiting for this queue slot - resolve it outside the queue task
							return {redirectedTo: responseData.url};
						}

						resource.setUrl(responseData.url);
						self.requestedResourcePromises.set(responseData.url, requestPromise);
					}

					resource.setType(getTypeByMime(responseData.mimeType));

					const { stream, ...responseInfo } = responseData;

					try {
						const { filename } = await self.runActions('generateFilename', { resource, responseData: responseInfo });
						resource.setFilename(filename);

						// if type was not determined by mime we can try to get it from filename after it was generated
						if (!resource.getType()) {
							resource.setType(getTypeByFilename(filename));
						}

						if (responseData.metadata) {
							resource.setMetadata(responseData.metadata);
						}

						resource.setEncoding(responseData.encoding);

						if (resource.isHtml() || resource.isCss()) {
							// html and css need full text to find and update links to child resources,
							// they are saved after their children are resolved - see Scraper.waitForLoad
							resource.setText((await readStreamToBuffer(stream)).toString(responseData.encoding));
							self.loadResource(resource);
						} else {
							// other types need no modification - stream them to storage immediately
							resource.setContentStream(stream);
							self.loadResource(resource);
							try {
								await self.saveResource(resource);
							} catch (err) {
								// saveResource already handled the error (warn log + onResourceError)
								// and rethrew because ignoreErrors is false. This task's rejection
								// would be discarded by Promise.allSettled in downloadChildrenResources,
								// so decide here whether the scrape must abort:
								// - a network failure while reading the body (got RequestError) of a
								//   child resource is a request error - same as a child failing before
								//   the body arrived, it does not abort the scrape
								// - anything else (storage/plugin failure, or a root resource failing)
								//   is remembered so that waitForLoad aborts the scrape
								const isChildNetworkError = err instanceof RequestError && Boolean(resource.parent);
								if (!isChildNetworkError) {
									self.fatalError = self.fatalError || err;
								}
							}
						}
					} catch (err) {
						stream.destroy(); // the stream was never handed over to a consumer - release the socket
						throw err;
					}
					return resource;
				});
			}).then(function resolveRedirectDuplicate (result) {
				if (result && result.redirectedTo) {
					return self.requestedResourcePromises.get(result.redirectedTo);
				}
				return result;
			}).catch(function handleError (err) {
				logger.error('failed to request resource ' + resource);
				return self.handleError(err, resource);
			});

		self.requestedResourcePromises.set(url, requestPromise);
		return requestPromise;
	}

	async requestResource (resource) {
		const url = resource.getUrl();
		const depth = resource.getDepth();

		if (this.options.urlFilter && depth > 0 && !this.options.urlFilter(url)) {
			logger.debug('filtering out ' + resource + ' by url filter');
			return null;
		}

		if (this.options.maxDepth && depth > this.options.maxDepth) {
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
		const loadResourcePromises = this.resources.map(
			resource => this.requestResource.bind(this, resource)
		);
		await series(loadResourcePromises);
		return this.waitForLoad();
	}

	// Returns a promise which gets resolved when all resources are loaded.
	// 1. Get all not saved resources and save them
	// 2. Recursion if any new not saved resource were added during this time. If not, loading is done.
	async waitForLoad () {
		if (this.fatalError) {
			// saving a streamed resource failed inside a request queue task - its rejection
			// was discarded by Promise.allSettled in downloadChildrenResources, re-throw
			// it here to abort the scrape (see Scraper.createNewRequest)
			throw this.fatalError;
		}

		const resourcesToSave = Array.from(this.loadedResources.values()).filter((r) => !r.isSaved());
		const loadingIsFinished = resourcesToSave.length === 0;

		if (!loadingIsFinished) {
			const saveResourcePromises = resourcesToSave.map(
				resource => this.saveResource.bind(this, resource)
			);
			await series(saveResourcePromises);
			return this.waitForLoad();
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

		logger.error('error occurred: ' + err.message);
		throw err;
	}

	async scrape () {
		try {
			await this.runActions('beforeStart', {options: this.options, utils});
			return await this.load();
		} catch (error) {
			logger.error('finishing with error: ' + error.message);
			await this.runActions('error', {error});
			throw error;
		} finally {
			await this.runActions('afterFinish');
		}
	}
}

export default Scraper;
