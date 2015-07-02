var path = require('path');

function PageObject (url, filename) {
	this.url = url;
	this.filename = filename;
}

PageObject.prototype.getUrl = function getUrl () {
	return this.url;
};

PageObject.prototype.setUrl = function setUrl (url) {
	this.url = url;
};

PageObject.prototype.getFilename = function getFilename () {
	return this.filename;
};

PageObject.prototype.setFilename = function setFilename (filename) {
	this.filename = filename;
};

PageObject.prototype.getText = function getText () {
	return this.text;
};

PageObject.prototype.setText = function setText (text) {
	this.text = text;
};

PageObject.prototype.getType = function getType () {
	var ext = path.extname(this.filename);
	switch (ext) {
		case '.css':
			return 'css';
		case '.html':
			return 'html';
		default:
			return 'other';
	}
};

module.exports = PageObject;
