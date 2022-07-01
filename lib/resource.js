import types from './config/resource-types.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { compress, decompress } from './utils/index.js';

class Resource {
	constructor (url, filename, tempMode, tempDir) {
		this.tempMode = tempMode || 'memory';
		this.tempDir = tempDir;

		if (this.tempMode === 'filesystem' && !this.tempDir) {
			throw new Error('tmpDir must be provided in tmpMode=filesystem');
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
		const child = new Resource(url, filename, this.tempMode, this.tempDir);
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
		if (this.tempDir) {
			// Generate a unique filename based on the md5 hash of the url
			const tmpName = `${crypto.createHash('md5').update(url).digest('hex')}.txt`;
			this.tempPath = path.join(this.tempDir, tmpName);
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
		switch (this.tempMode) {
			case 'memory':
				return await this.text;
			case 'memory-compressed':
				return (await decompress(this.text)).toString(this.getEncoding());
			case 'filesystem':
				return await fs.readFile(this.tempPath, { encoding: this.getEncoding() });
			default:
				throw new Error(`Unknown tempMode: ${this.tempMode}`);
		}
	}

	async setText (text) {
		switch (this.tempMode) {
			case 'memory':
				this.text = text;
				break;
			case 'memory-compressed':
				this.text = await compress(text);
				break;
			case 'filesystem':
				await fs.mkdir(this.tempDir, { recursive: true });
				await fs.writeFile(this.tempPath, text, { encoding: this.getEncoding() });
				break;
			default:
				throw new Error(`Unknown tempMode: ${this.tempMode}`);
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
}

export default Resource;
