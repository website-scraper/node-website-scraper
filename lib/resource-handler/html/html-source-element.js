var ImgSrcsetTag = require('../path-containers/html-img-srcset-tag');
var CommonTag = require('../path-containers/html-common-tag');
var CssText = require('../path-containers/css-text');
var _ = require('lodash');

var pathContainersByRule = [
	{ selector: '[style]', attr: 'style', containerClass: CssText },
	{ selector: 'style', containerClass: CssText },
	{ selector: 'img[srcset]', attr: 'srcset', containerClass: ImgSrcsetTag }
];

/**
 * Represents pair of cheerio element and rule to find text with children resources
 * @param {Object} el - cheerio obj for dom element
 * @param {Object} rule - rule used to find current element
 * @param {string} rule.selector - cheerio selector
 * @param {string} rule.attr - attribute to find text which contains resources. if not set - use inner html
 * @constructor
 */
function HtmlSourceElement (el, rule) {
	this.el = el;
	this.rule = rule;
}

HtmlSourceElement.prototype.getData = function getData () {
	return this.rule.attr ? this.el.attr(this.rule.attr) : this.el.text();
};

HtmlSourceElement.prototype.setData = function setData (newData) {
	this.rule.attr ? this.el.attr(this.rule.attr, newData) : this.el.text(newData);
};

HtmlSourceElement.prototype.getPathContainerClass = function getPathContainerClass () {
	var selectedRule = _.find(pathContainersByRule, (containerByRule) => {
		return this.el.is(containerByRule.selector) && this.rule.attr === containerByRule.attr;
	});

	return selectedRule ? selectedRule.containerClass : CommonTag;
};

HtmlSourceElement.prototype.getPathContainer = function getPathContainer () {
	var ContainerClass = this.getPathContainerClass();
	var textWithResources = this.getData();
	return textWithResources ? new ContainerClass(textWithResources) : null;
};

module.exports = HtmlSourceElement;
