var cheerio = require('cheerio');
var Promise = require('bluebird');
var _ = require('underscore');
var srcset = require('srcset');
var utils = require('../utils');

function loadHtml (context, resource) {
	var rules = context.getHtmlSources();
	var p = beforeHandle(resource);

	rules.forEach(function (rule) {
		p = p.then(function loadResources () {
			return loadResourcesForRule(context, resource, rule);
		});
	});
	return p;
}

function beforeHandle (resource) {
	var text = resource.getText();
	var $ = cheerio.load(text);

	// Handle <base> tag
	$('base').each(function () {
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

function getHandler (tag, attr) {
	if (tag === 'img' && attr === 'srcset') {
		return loadImgSrcsetResource;
	}
	return loadGeneralResource;
}

function loadImgSrcsetResource (context, parentResource, el, attrName) {
	var tagName = el[0].name;
	var attr = el.attr(attrName);

	var imgScrsetParts = srcset.parse(attr);

	return Promise.mapSeries(imgScrsetParts, function loadImgSrcsetPart (imgScrsetPart) {
		var resourceUrl = utils.getUrl(parentResource.getUrl(), imgScrsetPart.url);
		var htmlResource = parentResource.createChild(resourceUrl);
		htmlResource.setHtmlData({ tagName: tagName, attributeName: attrName });

		return context.loadResource(htmlResource).then(function (loadedResource) {
			imgScrsetPart.url = loadedResource.getFilename();
		});
	}).then(function updateSrcset() {
		return Promise.resolve(srcset.stringify(imgScrsetParts));
	});
}

function loadGeneralResource (context, parentResource, el, attrName) {
	var tagName = el[0].name;
	var attr = el.attr(attrName);

	var resourceUrl = utils.getUrl(parentResource.getUrl(), attr);
	var htmlResource = parentResource.createChild(resourceUrl);
	htmlResource.setHtmlData({ tagName: tagName, attributeName: attrName });

	return context.loadResource(htmlResource).then(function handleLoadedSource (loadedResource) {
		var relativePath = utils.getRelativePath(parentResource.getFilename(), loadedResource.getFilename());
		var hash = utils.getHashFromUrl(attr);

		if (hash && loadedResource.isHtml()) {
			relativePath = relativePath.concat(hash);
		}

		return Promise.resolve(relativePath);
	});
}

function loadResourcesForRule (context, resource, rule) {
	var text = resource.getText();
	var $ = cheerio.load(text);

	var promises = $(rule.selector).map(function loadForElement () {
		var el = $(this);
		if (el.attr(rule.attr)) {
			var loadResourcesForElement = getHandler(el[0].name, rule.attr);
			return loadResourcesForElement(context, resource, el, rule.attr).then(function changeAttr (updatedAttr) {
				el.attr(rule.attr, updatedAttr);
			});
		}
		return Promise.reject();
	});

	return utils.waitAllFulfilled(promises).then(function () {
		text = $.html();
		resource.setText(text);
		return resource;
	});
}

module.exports = loadHtml;
