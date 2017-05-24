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
 */
class HtmlSourceElement {
	/**
	 * @param {Object} el - cheerio obj for dom element
	 * @param {Object} rule - rule used to find current element
	 * @param {string} rule.selector - cheerio selector
	 * @param {string} rule.attr - attribute to find text which contains resources. if not set - use inner html
	 */
	constructor (el, rule) {
		this.el = el;
		this.rule = rule;
	}

	/**
	 * Get resource data from element using rule
	 * @returns {string}
	 */
	getData () {
		const text = this.rule.attr ? this.el.attr(this.rule.attr) : this.el.text();
		return utils.decodeHtmlEntities(text);
	}

	/**
	 * Update attribute or inner text of el with new data
	 * @param {string} newData
	 */
	setData (newData) {
		this.rule.attr ? this.el.attr(this.rule.attr, newData) : this.el.text(newData);
	}

	removeIntegrityCheck () {
		if (this.el.attr('integrity')) {
			this.el.attr('integrity', null);
		}
	}

	/**
	 * Returns PathContainer instance for element
	 * @returns {CssText|HtmlCommonTag|HtmlImgSrcSetTag|null}
	 */
	getPathContainer () {
		const selectedRule = this.findMatchedRule(pathContainersByRule);
		const ContainerClass = selectedRule ? selectedRule.containerClass : CommonTag;
		const textWithResources = this.getData();
		return textWithResources ? new ContainerClass(textWithResources) : null;
	}

	matchesRule (rule) {
		return this.el.is(rule.selector) && this.rule.attr === rule.attr;
	}

	findMatchedRule (rulesArray) {
		return rulesArray.find(this.matchesRule, this);
	}

	toString () {
		return JSON.stringify({selector: this.rule.selector, attr: this.rule.attr, data: this.getData()});
	}
}

module.exports = HtmlSourceElement;
