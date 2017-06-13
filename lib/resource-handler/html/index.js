'use strict';

const cheerio = require('cheerio');
const Promise = require('bluebird');
const utils = require('../../utils');
const logger = require('../../logger');
const HtmlSourceElement = require('./html-source-element');

class HtmlResourceHandler {
	constructor (options, methods) {
		this.options = options;
		this.downloadChildrenPaths = methods.downloadChildrenPaths;
		this.updateChildrenPaths = methods.updateChildrenPaths;

		this.recursiveSources = this.options.recursiveSources || [];
		this.downloadSources = this.options.sources;
		this.updateSources = [];

		if (this.options.updateMissingSources === true) {
			this.updateSources = this.downloadSources;
		} else if (Array.isArray(this.options.updateMissingSources)) {
			this.updateSources = this.options.updateMissingSources;
		}

		this.allSources = utils.union(this.downloadSources, this.updateSources);
	}

	handle (resource) {
		const $ = loadTextToCheerio(resource.getText());
		prepareToLoad($, resource);

		return Promise.mapSeries(this.allSources, this.loadResourcesForRule.bind(this, $, resource))
			.then(() => {
				resource.setText($.html());
				return resource;
			});
	}

	loadResourcesForRule ($, parentResource, rule) {
		const self = this;
		const promises = $(rule.selector).map((i, element) => {
			const el = new HtmlSourceElement($(element), rule);
			const pathContainer = el.getPathContainer();

			if (!pathContainer) {
				return Promise.resolve(null);
			}

			const needToDownloadElement = this.needToDownload(el);
			const needToUpdateElement = this.needToUpdate(el);

			if (this.exceedMaxRecursiveDepth(el, parentResource)) {
				logger.debug(`filtering out ${el} by max recursive depth`);
				return self.updateChildrenPaths(pathContainer, parentResource, needToUpdateElement).then(el.setData.bind(el));
			}

			if (!needToDownloadElement) {
				return self.updateChildrenPaths(pathContainer, parentResource, needToUpdateElement).then(el.setData.bind(el));
			}

			return self.downloadChildrenPaths(pathContainer, parentResource, needToUpdateElement)
				.then((updatedText) => {
					el.setData(updatedText);
					el.removeIntegrityCheck();
				});

		}).get();

		return utils.waitAllFulfilled(promises);
	}

	exceedMaxRecursiveDepth (el, parentResource) {
		const isRecursive = Boolean(el.findMatchedRule(this.recursiveSources));
		const isDepthGreaterThanMax = this.options.maxRecursiveDepth && parentResource.getDepth() >= this.options.maxRecursiveDepth;
		return isRecursive && isDepthGreaterThanMax;
	}

	needToDownload (el) {
		return Boolean(el.findMatchedRule(this.downloadSources));
	}

	needToUpdate (el) {
		return Boolean(el.findMatchedRule(this.updateSources));
	}
}

function prepareToLoad ($, resource) {
	$('base').each((i, element) => {
		const el = $(element);
		const href = el.attr('href');
		if (href) {
			const newUrl = utils.getUrl(resource.getUrl(), href);
			resource.setUrl(newUrl);
			el.remove();
		}
	});
}

function loadTextToCheerio (text) {
	return cheerio.load(text, {
		decodeEntities: false
	});
}

module.exports = HtmlResourceHandler;
