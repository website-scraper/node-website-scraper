var CssText = require('./css-text');
var HtmlCommonTag = require('./html-common-tag');
var HtmlImgSrcsetTag = require('./html-img-srcset-tag');
var _ = require('lodash');

var containersByRule = [
	{ selector: '[style]', attr: 'style', containerClass: CssText },
	{ selector: 'style', containerClass: CssText },
	{ selector: 'img[srcset]', attr: 'srcset', containerClass: HtmlImgSrcsetTag }
];

function getForElementByRule (el, rule) {
	var selectedRule = _.find(containersByRule, (containerByRule) => {
		return el.is(containerByRule.selector) && rule.attr === containerByRule.attr;
	});

	return selectedRule ? selectedRule.containerClass : HtmlCommonTag;
}

module.exports = {
	getForElement: getForElementByRule
};
