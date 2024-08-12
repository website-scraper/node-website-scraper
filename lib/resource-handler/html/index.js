import * as cheerio from 'cheerio';
import { union, getUrl, series, updateResourceEncoding } from '../../utils/index.js';
import logger from '../../logger.js';
import HtmlSourceElement from './html-source-element.js';

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

		this.allSources = union(this.downloadSources, this.updateSources);
	}

	async handle (resource) {
		prepareToLoad(resource);
		const $ = loadTextToCheerio(resource.getText());
		const sourceRulesLoadPromises = this.allSources.map(
			rule => this.loadResourcesForRule.bind(this, $, resource, rule)
		);
		await series(sourceRulesLoadPromises);

		resource.setText($.html());
		return resource;
	}

	loadResourcesForRule ($, parentResource, rule) {
		const self = this;
		const promises = $(rule.selector).map((i, element) => {
			const el = new HtmlSourceElement($(element), rule);
			const pathContainer = el.getPathContainer();

			if (!pathContainer) {
				return Promise.resolve(null);
			}

			if (this.exceedMaxRecursiveDepth(el, parentResource)) {
				logger.debug(`filtering out ${el} by max recursive depth`);
				return self.updateChildrenPaths(pathContainer, parentResource).then(el.setData.bind(el));
			}

			return self.downloadChildrenPaths(pathContainer, parentResource)
				.then((updatedText) => {
					el.setData(updatedText);
					el.removeIntegrityCheck();
				});

		}).get();

		return Promise.allSettled(promises);
	}

	exceedMaxRecursiveDepth (el, parentResource) {
		const isRecursive = Boolean(el.findMatchedRule(this.recursiveSources));
		const isDepthGreaterThanMax = this.options.maxRecursiveDepth && parentResource.getDepth() >= this.options.maxRecursiveDepth;
		return isRecursive && isDepthGreaterThanMax;
	}
}

function prepareToLoad (resource) {
	const $ = loadTextToCheerio(resource.getText());

	$('base[href]').each((i, element) => {
		const el = $(element);
		const href = el.attr('href');
		if (href) {
			const newUrl = getUrl(resource.getUrl(), href);
			logger.debug(`<base> tag found in resource ${resource}, changing url to ${newUrl}`);
			resource.setUrl(newUrl);
			
			el.remove();
			resource.setText($.html());
		}
	});

	$('meta[charset]').each((i, element) => {
		const el = $(element);
		const charset = el.attr('charset')?.toLowerCase();
		if (charset && charset === 'utf-8') { // utf-8 is the only valid value for html5 documents
			updateResourceEncoding(resource, 'utf8');
		}
	});	
}

function loadTextToCheerio (text) {
	return cheerio.load(text);
}

export default HtmlResourceHandler;
