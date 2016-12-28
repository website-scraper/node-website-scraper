var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../../utils');
var HtmlSourceElement = require('./html-source-element');

function HtmlResourceHandler (options, handleChildrenPaths) {
	this.options = options;
	this.handleChildrenPaths = handleChildrenPaths;
}

HtmlResourceHandler.prototype.handle = function handle (resource) {
	var $ = loadTextToCheerio(resource.getText());
	prepareToLoad($, resource);

	return Promise.mapSeries(this.options.sources, this.loadResourcesForRule.bind(this, $, resource))
		.then(function updateResource () {
			resource.setText($.html());
			return resource;
		});
};

HtmlResourceHandler.prototype.loadResourcesForRule = function loadResourcesForRule ($, resource, rule) {
	var self = this;
	var promises = $(rule.selector).map(function loadForElement () {
		var el = new HtmlSourceElement($(this), rule);
		var pathContainer = el.getPathContainer();
		if (!pathContainer) {
			return Promise.resolve();
		}
		return self.handleChildrenPaths(pathContainer, resource, createHtmlData(el)).then(el.setData.bind(el));
	}).get();

	return utils.waitAllFulfilled(promises);
};

function prepareToLoad ($, resource) {
	$('base').each(function handleBaseTag () {
		var el = $(this);
		var href = el.attr('href');
		if (href) {
			var newUrl = utils.getUrl(resource.getUrl(), href);
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

/**
 * @param {HtmlSourceElement} htmlSourceEl
 * @returns {HtmlData}
 */
function createHtmlData (htmlSourceEl) {
	return {
		tagName: htmlSourceEl.el[0].name,
		attributeName: htmlSourceEl.rule.attr,
		attributeValue: htmlSourceEl.el.attr(htmlSourceEl.rule.attr)
	};
}

module.exports = HtmlResourceHandler;
