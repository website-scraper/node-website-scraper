var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../utils');

function loadHtml (context, resource) {
	var sources = context.getHtmlSources();
	var handleResources = loadResources.bind(null, context, resource);

	var p = beforeHandle(resource);

	sources.forEach(function (src) {
		p = p.then(function loadSource () {
			return handleResources(src);
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

function loadResources (context, resource, source) {
	var url = resource.getUrl();
	var text = resource.getText();
	var filename = resource.getFilename();
	var $ = cheerio.load(text);

	var promises = $(source.selector).map(function loadForSelector () {
		var el = $(this);
		var attr = el.attr(source.attr);

		if (attr) {
			var resourceUrl = utils.getUrl(url, attr);
			var htmlResource = resource.createChild(resourceUrl);
			htmlResource.setHtmlData({ tagName: el[0].name, attributeName: source.attr });

			return context.loadResource(htmlResource).then(function handleLoadedSource (loadedResource) {
				var relativePath = utils.getRelativePath(filename, loadedResource.getFilename());
				//Don't take out named anchors / hashlinks
				//Find out if link is a named anchor and append it to the relative Path
				//Start out with an empty string
				var named = "";
				if(el.attr(source.attr).charAt(0) === "#"){
					named = el.attr(source.attr);
				}
				el.attr(source.attr, relativePath.concat(named));
				return Promise.resolve();
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
