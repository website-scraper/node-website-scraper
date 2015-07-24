var path = require('path');

function Resource (url, filename) {
	this.url = url;
	this.filename = filename;
}

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

Resource.prototype.getType = function getType () {
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

module.exports = Resource;
