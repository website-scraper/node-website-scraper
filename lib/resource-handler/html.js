var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../utils');
var getPathContainer = require('./path-containers').getForElement;
// var ImgSrcsetTag = require('./path-containers/html-img-srcset-tag');
// var CommonTag = require('./path-containers/html-common-tag');
// var CssText = require('./path-containers/css-text');

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

function handleElement (context, el, rule, parentResource) {
	var PathContainer = getPathContainer(el, rule);
	var pathContainer, textWithResources;

	if (rule.attr) {
		textWithResources = el.attr(rule.attr);
		if (!textWithResources) {
			return Promise.resolve();
		}
		pathContainer = new PathContainer(textWithResources);
		return context.handleChildrenResources(pathContainer, parentResource, createHtmlData(el, rule.attr)).then((updatedText) => {
			el.attr(rule.attr, updatedText);
		});
	} else {
		textWithResources = el.text();
		if (!textWithResources) {
			return Promise.resolve();
		}
		pathContainer = new PathContainer(textWithResources);
		return context.handleChildrenResources(pathContainer, parentResource).then((updatedText) => {
			el.text(updatedText);
		});
	}
}

function SourceElement (el, rule) {
	this.el = el;
	this.rule = rule;
}

SourceElement.prototype.getData = function getData () {
	return this.rule.attr ? this.el.attr(this.rule.attr) : this.el.text();
};

SourceElement.prototype.setData = function (newData) {
	this.rule.attr ? this.el.attr(this.rule.attr, newData) : this.el.text(newData);
};

function loadResourcesForRule (context, resource, rule) {
	var $ = loadTextToCheerio(resource.getText());

	var promises = $(rule.selector).map(function loadForElement () {
		var el = new SourceElement($(this), rule);
		return handleElement(context, $(this), rule, resource);
	}).get();

	return utils.waitAllFulfilled(promises).then(function updateHtmlText () {
		text = $.html();
		resource.setText(text);
		return resource;
	});
}

module.exports = loadHtml;
