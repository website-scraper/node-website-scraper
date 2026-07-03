import { Readable } from 'stream';
import types from './config/resource-types.js';

class Resource {
	constructor (url, filename) {
		this.url = url;
		this.filename = filename;

		this.type = null;
		this.depth = 0;

		this.parent = null;
		this.children = [];

		this.saved = false;
		this.encoding = 'binary';
	}

	createChild (url, filename) {
		const child = new Resource(url, filename);

		child.parent = this;
		child.depth = this.getDepth() + 1;

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

	setContentStream (stream) {
		this.contentStream = stream;
	}

	/**
	 * Returns resource content as a Readable stream.
	 * For buffered (html/css) resources a fresh stream is created on each call.
	 * For streamed resources the live response stream is returned - it can be consumed only once.
	 * Returns null when content was already cleared (see clearContent).
	 */
	getContentStream () {
		if (this.contentStream) {
			return this.contentStream;
		}
		if (typeof this.text === 'string') {
			return Readable.from(Buffer.from(this.text, this.encoding));
		}
		return null;
	}

	clearContent () {
		this.text = null;
		this.contentStream = null;
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
		return `{ url: "${this.getUrl()}", filename: "${this.getFilename()}", depth: ${this.getDepth()}, type: "${this.getType()}" }`;
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
