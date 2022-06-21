import types from './config/resource-types.js';
import zlib from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const inflate = promisify(zlib.inflate);
const defalate = promisify(zlib.deflate);

class Resource {
	constructor (url, filename, tmpMode, tmpPath) {
		this.setUrl(url);
		this.setFilename(filename);

		this.tmpMode = tmpMode || 'memory';
		if (tmpMode === 'filesystem') {
			this.tmpPath = tmpPath || fs.mkdtempSync('website-scraper-');
		}

		this.type = null;
		this.depth = 0;

		this.parent = null;
		this.children = [];

		this.saved = false;
		this.encoding = 'binary';
	}

	createChild (url, filename) {
		const child = new Resource(url, filename, this.tmpMode, this.tmpPath);
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
		if (this.tmpPath) {
			// Generate a unique filename based on the md5 hash of the url
			const tmpName = `${crypto.createHash('md5').update(url).digest('hex')}.txt`;
			this.tmpPath = path.join(this.tmpPath, tmpName);
		}

		this.url = url;
	}

	getFilename () {
		return this.filename;
	}

	setFilename (filename) {
		this.filename = filename;
	}

	getText () {
		switch (this.tmpMode) {
			case 'memory':
				return this.memoryRead();
			case 'memory-compressed':
				return this.memoryReadCompressed();
			case 'fs':
			case 'filesystem':
				return this.fsRead();
			default:
				throw new Error('Unknown tmpMode');
		}
	}

	setText (text) {
		switch (this.tmpMode) {
			case 'memory':
				return this.memoryWrite(text);
			case 'memory-compressed':
				return this.memoryWriteCompressed(text);
			case 'fs':
			case 'filesystem':
				return this.fsWrite(text);
			default:
				throw new Error('Unknown tmpMode');
		}
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

	setEncoding (encoding) {
		this.encoding = encoding;
	}

	getEncoding () {
		return this.encoding;
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

	// Read/write functions
	// memory
	async memoryRead () {
		return this.text;
	}
	async memoryWrite (text) {
		this.text = text;
	}

	// memory-compressed
	// When compressed store data in memory as a buffer, saves the toString/Buffer.from step every-time. 
	async memoryReadCompressed () {
		return inflate(this.text).toString(this.getEncoding());
	}
	async memoryWriteCompressed (text) {
		this.text = defalate(Buffer.from(text), { level: 6 });
	}

	// FS
	async fsRead () {
		return fs.promises.readFile(this.tmpPath, { encoding: this.getEncoding() });
	}
	async fsWrite (text) {
		return fs.promises.writeFile(this.tmpPath, text, { encoding: this.getEncoding() });
	}
}

export default Resource;
