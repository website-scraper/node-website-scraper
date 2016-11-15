var _ = require('lodash');
var utils = require('./utils');
var types = require('./config/resource-types');
var typesByHtmlData = require('./config/resource-types-by-tag');

function getTypeByHtmlData (htmlData) {
	var type = _.findKey(typesByHtmlData, function containsHtmlData (rules) {
		return _.find(rules, htmlData);
	});
	return type || types.other;
}

function Resource (url, filename) {
	this.url = url;
	this.filename = filename;
	this.assets = [];
}

Resource.prototype.createChild = function createChild (url, filename) {
	var child = new Resource(url, filename);

	var currentDepth = this.getDepth();

	child.setParent(this);
	child.setDepth(++currentDepth);

	this.assets.push(child);

	return child;
};

Resource.prototype.updateChild = function updateChild (oldChild, newChild) {
	var index = _.indexOf(this.assets, oldChild);
	if (index >= 0) {
		this.assets[index] = newChild;
	}
};

Resource.prototype.getUrl = function getUrl () {
	return this.url;
};

Resource.prototype.setUrl = function setUrl (url) {
	this.url = url;
};

Resource.prototype.getFilename = function getFilename () {
	return this.filename;
};

Resource.prototype.setFilename = function setFilename (filename) {
	this.filename = filename;
};

Resource.prototype.getText = function getText () {
	return this.text;
};

Resource.prototype.setText = function setText (text) {
	this.text = text;
};

Resource.prototype.setParent = function setParent (parent) {
	this.parent = parent;
};

Resource.prototype.getDepth = function getDepth () {
	return this.depth || 0;
};

Resource.prototype.setDepth = function setDepth (depth) {
	this.depth = depth;
};

/**
 * Html Data for resource, represents html element where resource was found
 *
 * @typedef {Object} HtmlData
 * @property {string} tagName - tag of element
 * @property {string} attributeName - attribute in tag where resource was found
 * @property {string} attributeValue - attribute value, contains url of resources
 *
 * Example: for resource in <img src="/images/foo.png"> it will be
 *  {
 *   tagName: 'img',
 *   attributeName: 'src',
 *   attributeValue: '/images/foo.png'
 *  }
 */

/**
 *
 * @param {HtmlData} data
 */
Resource.prototype.setHtmlData = function setHtmlData (data) {
	this.htmlData = _.pick(data, ['tagName', 'attributeName']);
};

Resource.prototype.getType = function getType () {
	var ext = utils.getFilenameExtension(this.filename);
	var parent = this.parent;
	var hasHtmlData = !_.isEmpty(this.htmlData);

	switch (true) {
		case ext === '.html' || ext === '.htm':
			return types.html;
		case ext === '.css':
		case !ext && parent && parent.isCss():
			return types.css;
		case !ext && parent && parent.isHtml() && hasHtmlData:
			return getTypeByHtmlData(this.htmlData);
		default:
			return types.other;
	}
};

Resource.prototype.isHtml = function isHtml () {
	return this.getType() === types.html;
};

Resource.prototype.isCss = function isCss () {
	return this.getType() === types.css;
};

Resource.prototype.toString = function toString () {
	return '{ url: "' + this.getUrl() + '", filename: "' + this.getFilename() + '", depth: ' + this.getDepth() + ' }';
};

Resource.prototype.isSaved = function isSaved () {
	return this.saved || 0;
};

Resource.prototype.setSaved = function setSaved () {
	this.saved = 1;
};

module.exports = Resource;
