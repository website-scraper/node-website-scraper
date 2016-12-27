var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../../utils');
var HtmlSourceElement = require('./html-source-element');

function loadHtml (context, resource) {
	return beforeHandle(resource).then(function () {
		return Promise.mapSeries(context.options.sources, loadResourcesForRule.bind(null, context, resource));
	});
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

function loadResourcesForRule (context, resource, rule) {
	var $ = loadTextToCheerio(resource.getText());

	var promises = $(rule.selector).map(function loadForElement () {
		var el = new HtmlSourceElement($(this), rule);
		var pathContainer = el.getPathContainer();
		if (!pathContainer) {
			return Promise.resolve();
		}
		return context.handleChildrenResources(pathContainer, resource, createHtmlData(el.el, el.rule.attr)).then((updatedText) => {
			el.setData(updatedText);
		});
	}).get();

	return utils.waitAllFulfilled(promises).then(function updateHtmlText () {
		var text = $.html();
		resource.setText(text);
		return resource;
	});
}

module.exports = loadHtml;