var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../utils');

function loadHtml (context, resource) {
	var sources = context.getHtmlSources();
	var handleResources = loadResources.bind(null, context, resource);

	var p = beforeHandle(resource);

	sources.forEach(function addSourceHandlingToChain (src) {
		p = p.then(function loadSource () {
			return handleResources(src);
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

function loadResources (context, resource, source) {
	var url = resource.getUrl();
	var text = resource.getText();
	var filename = resource.getFilename();
	var $ = loadTextToCheerio(text);

	var promises = $(source.selector).map(function loadForSelector () {
		var el = $(this);
		var attr = el.attr(source.attr);

		if (attr) {
			var childUrl = utils.getUrl(url, attr);
			var childResource = resource.createChild(childUrl);
			childResource.setHtmlData({ tagName: el[0].name, attributeName: source.attr });

			return context.loadResource(childResource).then(function handleLoadedSource (loadedResource) {
				resource.updateChild(childResource, loadedResource);

				var relativePath = utils.getRelativePath(filename, loadedResource.getFilename());
				var hash = utils.getHashFromUrl(attr);

				if (hash && loadedResource.isHtml()) {
					relativePath = relativePath.concat(hash);
				}

				el.attr(source.attr, relativePath);
				return Promise.resolve();
			});
		}
		return Promise.reject();
	}).get();

	return utils.waitAllFulfilled(promises).then(function updateHtmlText () {
		text = $.html();
		resource.setText(text);
		return resource;
	});
}

module.exports = loadHtml;
