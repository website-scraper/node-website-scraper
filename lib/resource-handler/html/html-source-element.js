var ImgSrcsetTag = require('../path-containers/html-img-srcset-tag');
var CommonTag = require('../path-containers/html-common-tag');
var CssText = require('../path-containers/css-text');
var _ = require('lodash');

var pathContainersByRule = [
	{ selector: '[style]', attr: 'style', containerClass: CssText },
	{ selector: 'style', containerClass: CssText },
	{ selector: 'img[srcset]', attr: 'srcset', containerClass: ImgSrcsetTag }
];

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

SourceElement.prototype.getPathContainerClass = function getPathContainerClass () {
	var selectedRule = _.find(pathContainersByRule, (containerByRule) => {
		return this.el.is(containerByRule.selector) && this.rule.attr === containerByRule.attr;
	});

	return selectedRule ? selectedRule.containerClass : CommonTag;
};

SourceElement.prototype.getPathContainer = function getPathContainer() {
	var ContainerClass = this.getPathContainerClass();
	var textWithResources = this.getData();
	return textWithResources ? new ContainerClass(textWithResources) : null;
};

module.exports = SourceElement;