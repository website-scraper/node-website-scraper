var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../utils');
var ImgSrcsetTag = require('./path-handlers/html-img-srcset-tag');
var CommonTag = require('./path-handlers/html-common-tag');

function loadHtml (context, resource) {
	var rules = context.options.sources;
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
	var pathHandler;
	if (htmlData.tagName === 'img' && htmlData.attributeName === 'srcset') {
		pathHandler = ImgSrcsetTag;
	} else {
		pathHandler = CommonTag;
	}
	return loadResource.bind(null, pathHandler);
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
 * Download resource
 * @param PathHandler - class of PathHandler - imgSrcsetTag or CommonTag
 * @param context
 * @param {Resource} parentResource
 * @param {HtmlData} childResourceHtmlData
 * @returns {Promise}
 */
function loadResource (PathHandler, context, parentResource, childResourceHtmlData) {
	var attr = childResourceHtmlData.attributeValue;
	var commonTag = new PathHandler(attr);
	var childrenPaths = commonTag.getPaths();
	var pathsToUpdate = [];

	return Promise.mapSeries(childrenPaths, function loadChildrenPath (childrenPath) {
		var childResourceUrl = utils.getUrl(parentResource.getUrl(), childrenPath);

		var childResource = parentResource.createChild(childResourceUrl);
		childResource.setHtmlData(childResourceHtmlData);

		return context.requestResource(childResource).then(function updateSrcsetPart (respondedResource) {
			if (respondedResource) {
				parentResource.updateChild(childResource, respondedResource);

				var relativePath = utils.getRelativePath(parentResource.getFilename(), respondedResource.getFilename());
				if (context.options.prettifyUrls) {
					relativePath = relativePath.replace(context.options.defaultFilename, '');
				}
				var hash = utils.getHashFromUrl(childrenPath);

				if (hash && respondedResource.isHtml()) {
					relativePath = relativePath.concat(hash);
				}

				pathsToUpdate.push({ oldPath: childrenPath, newPath: relativePath});

				// Do not wait for loadResource here, to prevent deadlock, see scraper.waitForLoad
				context.loadResource(respondedResource);
			}
			return null; // Prevent Bluebird warnings
		});
	}).then(function updateChildrenPaths () {
		return Promise.resolve(commonTag.updateText(pathsToUpdate));
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
