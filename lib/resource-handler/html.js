var cheerio = require('cheerio');
var Promise = require('bluebird');
var utils = require('../utils');
var ImgSrcsetTag = require('./path-containers/html-img-srcset-tag');
var CommonTag = require('./path-containers/html-common-tag');

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

function loadResourcesForRule (context, resource, rule) {
	var text = resource.getText();
	var $ = loadTextToCheerio(text);

	var promises = $(rule.selector).map(function loadForElement () {
		var el = $(this);
		var attributeValue = $(this).attr(rule.attr);
		if (attributeValue) {
			var childResourceHtmlData = createHtmlData(el, rule.attr);
			var PathContainer;
			if (childResourceHtmlData.tagName === 'img' && childResourceHtmlData.attributeName === 'srcset') {
				PathContainer = ImgSrcsetTag;
			} else {
				PathContainer = CommonTag;
			}
			var pathContainer = new PathContainer(childResourceHtmlData.attributeValue);

			return context.handleChildrenResources(pathContainer, resource, childResourceHtmlData).then(function changeAttr (updatedAttr) {
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
