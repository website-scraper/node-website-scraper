var types = require('./resource-types');

var typesByHtmlTag = {};

typesByHtmlTag[types.css] = [
	{ tagName: 'link', attributeName: 'href' }
];
typesByHtmlTag[types.html] = [
	{ tagName: 'a', attributeName: 'href' },
	{ tagName: 'iframe', attributeName: 'src' }
];

module.exports = typesByHtmlTag;
