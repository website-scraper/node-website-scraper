var cheerio = require('cheerio');
var Promise = require('bluebird');
var srcset = require('srcset');
var utils = require('../utils');

function loadHtml (context, resource) {
	var rules = context.getHtmlSources();
	var p = beforeHandle(resource);

	rules.forEach(function loadForRule (rule) {
		p = p.then(function loadResources () {
			return loadResourcesForRule(context, resource, rule);
		});
	});
	return p;
}

function loadTextToCheerio (text) {
	return cheerio.load(text, {
		decodeEntities: false
	});
}

function beforeHandle (resource) {
	var text = resource.getText();
	var $ = loadTextToCheerio(text);

	$('base').each(function handleBaseTag () {
		var el = $(this);
		var href = el.attr('href');
		if (href) {
			var newUrl = utils.getUrl(resource.getUrl(), href);
			resource.setUrl(newUrl);
			el.remove();
		}
	});

	text = $.html();
	resource.setText(text);

	return Promise.resolve(resource);
}

/**
 * @param {HtmlData} htmlData
 * @returns {Function} - function which loads resources with given html data
 */
function getResourceLoaderByHtmlData (htmlData) {
	if (htmlData.tagName === 'img' && htmlData.attributeName === 'srcset') {
		return loadImgSrcsetResource;
	}
	return loadGeneralResource;
}

/**
 * @param {Object} el - cheerio element
 * @param {string} attrName - attribute name
 * @returns {HtmlData}
 */
function createHtmlData (el, attrName) {
	return {
		tagName: el[0].name,
		attributeName: attrName,
		attributeValue: el.attr(attrName)
	};
}

/**
 * Download resources from <img srcset="...">
 * @param context
 * @param {Resource} parentResource
 * @param {HtmlData} childResourceHtmlData
 * @returns {Promise}
 */
function loadImgSrcsetResource (context, parentResource, childResourceHtmlData) {
	var imgScrsetParts = srcset.parse(childResourceHtmlData.attributeValue);

	return Promise.mapSeries(imgScrsetParts, function loadImgSrcsetPart (imgScrsetPart) {
		var childResourceUrl = utils.getUrl(parentResource.getUrl(), imgScrsetPart.url);
		var childResource = parentResource.createChild(childResourceUrl);
		childResource.setHtmlData(childResourceHtmlData);
		
		return context.requestResource(childResource).then(function updateSrcsetPart (respondedResource) {
			if (respondedResource) {
				parentResource.updateChild(childResource, respondedResource);
				imgScrsetPart.url = respondedResource.getFilename();

				// Do not wait for loadResource here, to prevent deadlock, see scraper.waitForLoad
				context.loadResource(childResource);
			}
			return null; // Prevent Bluebird warnings
		});
	}).then(function updateSrcset () {
		return Promise.resolve(srcset.stringify(imgScrsetParts));
	});
}

/**
 * Download common resource
 * @param context
 * @param {Resource} parentResource
 * @param {HtmlData} childResourceHtmlData
 * @returns {Promise}
 */
function loadGeneralResource (context, parentResource, childResourceHtmlData) {
	var attr = childResourceHtmlData.attributeValue;

	var resourceUrl = utils.getUrl(parentResource.getUrl(), attr);
	var childResource = parentResource.createChild(resourceUrl);
	childResource.setHtmlData(childResourceHtmlData);

	return context.requestResource(childResource).then(function handleLoadedSource (respondedResource) {
		if (!respondedResource) {
			return attr;
		}
		parentResource.updateChild(childResource, respondedResource);

		var relativePath = utils.getRelativePath(parentResource.getFilename(), respondedResource.getFilename());
		if (context.options.prettifyUrls) {
			relativePath = relativePath.replace(context.options.defaultFilename, '');
		}
		var hash = utils.getHashFromUrl(attr);

		if (hash && respondedResource.isHtml()) {
			relativePath = relativePath.concat(hash);
		}

		// Do not wait for loadResource here, to prevent deadlock, scraper.waitForLoad
		context.loadResource(childResource);

		return relativePath;
	});
}

function loadResourcesForRule (context, resource, rule) {
	var text = resource.getText();
	var $ = loadTextToCheerio(text);

	var promises = $(rule.selector).map(function loadForElement () {
		var el = $(this);
		if (el.attr(rule.attr)) {
			var childResourceHtmlData = createHtmlData(el, rule.attr);
			var loadResourcesForElement = getResourceLoaderByHtmlData(childResourceHtmlData);

			return loadResourcesForElement(context, resource, childResourceHtmlData).then(function changeAttr (updatedAttr) {
				el.attr(rule.attr, updatedAttr);
			});
		}
		return Promise.resolve();
	}).get();

	return utils.waitAllFulfilled(promises).then(function updateHtmlText () {
		text = $.html();
		resource.setText(text);
		return resource;
	});
}

module.exports = loadHtml;
