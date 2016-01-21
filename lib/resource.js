var _ = require('underscore');
var path = require('path');
var types = require('./config/resource-types');
var typesByHtmlData = require('./config/resource-types-by-tag');

function getTypeByHtmlData (htmlData) {
	var type = _.findKey(typesByHtmlData, function containsHtmlData (rules) {
		return _.findWhere(rules, htmlData);
	});
	return type || types.other;
}

function Resource (url, filename) {
	this.url = url;
	this.filename = filename;
}

Resource.prototype.createChild = function createChild (url, filename) {
	var child = new Resource(url, filename);

	var currentDepth = this.getDepth();

	child.setParent(this);
	child.setDepth(++currentDepth);

	return child;
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
 *
 * @param {Object} data - html element data
 * @param {string} data.tagName - tag name which contain resource
 * @param {string} data.attributeName - attribute name with value of resource's url
 */
Resource.prototype.setHtmlData = function setHtmlData (data) {
	this.htmlData = data;
};

Resource.prototype.getType = function getType () {
	var ext = path.extname(this.filename);
	var parentType = this.parent && this.parent.getType();
	var hasHtmlData = !!this.htmlData;

	switch (true) {
		case ext == '.html' || ext == '.htm':
			return types.html;
		case ext == '.css':
		case !ext && parentType == types.css:
			return types.css;
		case !ext && parentType == types.html && hasHtmlData:
			return getTypeByHtmlData(this.htmlData);
		default:
			return types.other;
	}
};

module.exports = Resource;
