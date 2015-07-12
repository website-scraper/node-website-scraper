var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('underscore');
var utils = require('../utils');
var PageObject = require('../page-object');

function loadHtml (context, pageObject) {
	var sources = context.getHtmlSources();
	var handleSources = loadSources.bind(null, context, pageObject);

	var p = beforeHandle(pageObject);

	_.each(sources, function (src) {
		p = p.then(function loadSource () {
			return handleSources(src);
		});
	});
	return p;
}

function beforeHandle (pageObject) {
	var text = pageObject.getText();
	var $ = cheerio.load(text);

	// Handle <base> tag
	$('base').each(function () {
		var el = $(this);
		var href = el.attr('href');
		if (href) {
			var newUrl = utils.getUrl(pageObject.getUrl(), href);
			pageObject.setUrl(newUrl);
			el.remove();
		}
	});

	text = $.html();
	pageObject.setText(text);

	return Promise.resolve(pageObject);
}

function loadSources (context, pageObject, source) {
	var url = pageObject.getUrl();
	var text = pageObject.getText();
	var filename = pageObject.getFilename();
	var $ = cheerio.load(text);

	var promises = $(source.selector).map(function loadForSelector () {
		var el = $(this);
		var attr = el.attr(source.attr);

		if (attr) {
			var sourceUrl = utils.getUrl(url, attr);
			var sourcePageObject = new PageObject(sourceUrl);

			return context.loadPageObject(sourcePageObject).then(function handleLoadedSource () {
				var relativePath = utils.getRelativePath(filename, sourcePageObject.getFilename());
				el.attr(source.attr, relativePath);
				return Promise.resolve();
			});
		}
		return Promise.reject();
	});

	return Promise.settle(promises).then(function () {
		text = $.html();
		pageObject.setText(text);
		return pageObject;
	});
}

module.exports = loadHtml;