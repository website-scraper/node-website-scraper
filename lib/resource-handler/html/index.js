'use strict';

const cheerio = require('cheerio');
const Promise = require('bluebird');
const utils = require('../../utils');
const logger = require('../../logger');
const HtmlSourceElement = require('./html-source-element');

class HtmlResourceHandler {
	constructor (options, handleChildrenPaths) {
		this.options = options;
		this.handleChildrenPaths = handleChildrenPaths;
	}

	handle (resource) {
		const $ = loadTextToCheerio(resource.getText());
		prepareToLoad($, resource);

		return Promise.mapSeries(this.options.sources, this.loadResourcesForRule.bind(this, $, resource))
			.then(function updateResource () {
				resource.setText($.html());
				return resource;
			});
	}

	loadResourcesForRule ($, parentResource, rule) {
		const self = this;
		const promises = $(rule.selector).map((i, element) => {
			const el = new HtmlSourceElement($(element), rule);

			const isRecursive = self.options.recursiveSources && Boolean(el.findMatchedRule(self.options.recursiveSources));
			const isDepthGreaterThanMax = self.options.maxRecursiveDepth && parentResource.getDepth() >= self.options.maxRecursiveDepth;
			if (isRecursive && isDepthGreaterThanMax) {
				logger.debug(`filtering out ${el} by max recursive depth`);
				return Promise.resolve();
			}

			const pathContainer = el.getPathContainer();
			if (!pathContainer) {
				return Promise.resolve();
			}
			return self.handleChildrenPaths(pathContainer, parentResource).then((updatedText) => {
				el.setData(updatedText);
				el.removeIntegrityCheck();
			});
		}).get();

		return utils.waitAllFulfilled(promises);
	}
}

function prepareToLoad ($, resource) {
	$('base').each(function handleBaseTag () {
		const el = $(this);
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
