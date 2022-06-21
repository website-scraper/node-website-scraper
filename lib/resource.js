import types from './config/resource-types.js';
import zlib from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const inflate = promisify(zlib.inflate);
const defalate = promisify(zlib.deflate);

class Resource {
	constructor (url, filename, tmpMode, tmpDir) {
		this.tmpMode = tmpMode || 'memory';
		if (tmpMode === 'fs' || tmpMode === 'filesystem') {
			this.tmpDir = tmpDir || fs.mkdtempSync(path.join(os.tmpdir(), 'website-scraper-'));
		}

		this.setUrl(url);
		this.setFilename(filename);

		this.type = null;
		this.depth = 0;

		this.parent = null;
		this.children = [];

		this.saved = false;
		this.encoding = 'binary';
	}

	createChild (url, filename) {
		const child = new Resource(url, filename, this.tmpMode, this.tmpDir);
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
		if (this.tmpDir) {
			// Generate a unique filename based on the md5 hash of the url
			const tmpName = `${crypto.createHash('md5').update(url).digest('hex')}.txt`;
			this.tmpPath = path.join(this.tmpDir, tmpName);
		}

		this.url = url;
	}

	getFilename () {
		return this.filename;
	}

	setFilename (filename) {
		this.filename = filename;
	}

	async getText () {
		switch (this.tmpMode) {
			case 'memory':
				return await this._memoryRead();
			case 'memory-compressed':
				return await this._memoryReadCompressed();
			case 'fs':
			case 'filesystem':
				return await this._fsRead();
			default:
				throw new Error('Unknown tmpMode');
		}
	}

	async setText (text) {
		switch (this.tmpMode) {
			case 'memory':
				return await this._memoryWrite(text);
			case 'memory-compressed':
				return await this._memoryWriteCompressed(text);
			case 'fs':
			case 'filesystem':
				return await this._fsWrite(text);
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
	async _memoryRead () {
		return this.text;
	}
	async _memoryWrite (text) {
		this.text = text;
	}

	// memory-compressed
	// When compressed store data in memory as a buffer, saves the toString/Buffer.from step every-time. 
	async _memoryReadCompressed () {
		return (await inflate(this.text)).toString(this.getEncoding());
	}
	async _memoryWriteCompressed (text) {
		this.text = await defalate(Buffer.from(text), { level: 6 });
	}

	// FS
	async _fsRead () {
		return await fs.promises.readFile(this.tmpPath, { encoding: this.getEncoding() });
	}
	async _fsWrite (text) {
		await fs.promises.writeFile(this.tmpPath, text, { encoding: this.getEncoding() });
	}
}

export default Resource;
