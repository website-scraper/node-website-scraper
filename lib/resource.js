var types = require('./config/resource-types');

function Resource (url, filename) {
	this.url = url;
	this.filename = filename;

	this.type = null;
	this.depth = 0;

	this.parent = null;
	this.children = [];

	this.saved = false;
}

Resource.prototype.createChild = function createChild (url, filename) {
	var child = new Resource(url, filename);
	var currentDepth = this.getDepth();

	child.parent = this;
	child.depth = ++currentDepth;

	this.children.push(child);

	return child;
};

Resource.prototype.updateChild = function updateChild (oldChild, newChild) {
	var index = this.children.indexOf(oldChild);
	if (index >= 0) {
		this.children[index] = newChild;
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

Resource.prototype.getDepth = function getDepth () {
	return this.depth;
};

Resource.prototype.setType = function setType (type) {
	this.type = type;
};

Resource.prototype.getType = function getType () {
	return this.type;
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
	return this.saved;
};

Resource.prototype.setSaved = function setSaved () {
	this.saved = true;
};

Resource.prototype.setMetadata = function setMetadata (metadata) {
	this.metadata = metadata;
};

module.exports = Resource;
