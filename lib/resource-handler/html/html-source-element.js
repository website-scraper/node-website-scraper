'use strict';

const ImgSrcsetTag = require('../path-containers/html-img-srcset-tag');
const CommonTag = require('../path-containers/html-common-tag');
const CssText = require('../path-containers/css-text');
const utils = require('../../utils');

const pathContainersByRule = [
	{ selector: '[style]', attr: 'style', containerClass: CssText },
	{ selector: 'style', containerClass: CssText },
	{ selector: '*[srcset]', attr: 'srcset', containerClass: ImgSrcsetTag }
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

/**
 * Get text from attr or from innerHtml of element based on rule
 * @returns {string}
 */
HtmlSourceElement.prototype.getData = function getData () {
	const text = this.rule.attr ? this.el.attr(this.rule.attr) : this.el.text();
	return utils.decodeHtmlEntities(text);
};

HtmlSourceElement.prototype.setData = function setData (newData) {
	this.rule.attr ? this.el.attr(this.rule.attr, newData) : this.el.text(newData);
};

HtmlSourceElement.prototype.getPathContainerClass = function getPathContainerClass () {
	const selectedRule = this.findMatchedRule(pathContainersByRule);
	return selectedRule ? selectedRule.containerClass : CommonTag;
};

HtmlSourceElement.prototype.getPathContainer = function getPathContainer () {
	const ContainerClass = this.getPathContainerClass();
	const textWithResources = this.getData();
	return textWithResources ? new ContainerClass(textWithResources) : null;
};

HtmlSourceElement.prototype.matchesRule = function matchesRule (rule) {
	return this.el.is(rule.selector) && this.rule.attr === rule.attr;
};

HtmlSourceElement.prototype.findMatchedRule = function findMatchedRule (rulesArray) {
	return rulesArray.find(this.matchesRule, this);
};

module.exports = HtmlSourceElement;
