const types = require('./config/resource-types');

class Resource {
	constructor (url, filename) {
		this.url = url;
		this.filename = filename;

		this.type = null;
		this.depth = 0;

		this.parent = null;
		this.children = [];

		this.saved = false;
	}

	createChild (url, filename) {
		const child = new Resource(url, filename);
		let currentDepth = this.getDepth();

		child.parent = this;
		child.depth = ++currentDepth;

		this.children.push(child);

		return child;
	}

	updateChild (oldChild, newChild) {
		const index = this.children.indexOf(oldChild);
		if (index >= 0) {
			this.children[index] = newChild;
		}
	}

	getUrl () {
		return this.url;
	}

	setUrl (url) {
		this.url = url;
	}

	getFilename () {
		return this.filename;
	}

	setFilename (filename) {
		this.filename = filename;
	}

	getText () {
		return this.text;
	}

	setText (text) {
		this.text = text;
	}

	getDepth () {
		return this.depth;
	}

	setType (type) {
		this.type = type;
	}

	getType () {
		return this.type;
	}

	isHtml () {
		return this.getType() === types.html;
	}

	isCss () {
		return this.getType() === types.css;
	}

	toString () {
		return '{ url: "' + this.getUrl() + '", filename: "' + this.getFilename() + '", depth: ' + this.getDepth() + ' }';
	}

	isSaved () {
		return this.saved;
	}

	setSaved () {
		this.saved = true;
	}

	setMetadata (metadata) {
		this.metadata = metadata;
	}
}

module.exports = Resource;
