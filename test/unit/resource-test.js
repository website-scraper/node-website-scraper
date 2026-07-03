import * as chai from 'chai';
import { Readable } from 'stream';
import { text as readStreamText, buffer as readStreamBuffer } from 'stream/consumers';
const should = chai.should();
import '../../test/utils/assertions.js';
import Resource from '../../lib/resource.js';

describe('Resource', function() {
	describe('#createChild', function () {
		it('should return Resource', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.should.be.instanceOf(Resource);
		});

		it('should set correct url and filename', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com', 'google.html');
			child.getUrl().should.eql('http://google.com');
			child.getFilename().should.equalFileSystemPath('google.html');
		});

		it('should set parent', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.parent.should.be.equal(parent);
		});

		it('should set depth', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.depth.should.eql(1);

			const childOfChild = child.createChild('http://google.com.ua');
			childOfChild.depth.should.eql(2);
		});
	});

	describe('#getContentStream', function () {
		it('should return null when resource has no content', function () {
			const resource = new Resource('http://example.com');
			should.not.exist(resource.getContentStream());
		});

		it('should return stream set with setContentStream', function () {
			const resource = new Resource('http://example.com');
			const stream = Readable.from(Buffer.from('binary data'));
			resource.setContentStream(stream);
			resource.getContentStream().should.be.equal(stream);
		});

		it('should return fresh stream with text content on each call', async function () {
			const resource = new Resource('http://example.com');
			resource.setEncoding('utf8');
			resource.setText('some text');

			const firstText = await readStreamText(resource.getContentStream());
			const secondText = await readStreamText(resource.getContentStream());
			firstText.should.be.eql('some text');
			secondText.should.be.eql('some text');
		});

		it('should encode text with resource encoding', async function () {
			const resource = new Resource('http://example.com');
			const originalBytes = Buffer.from([0xff, 0x00, 0xab, 0x10]);
			resource.setText(originalBytes.toString('binary')); // default encoding is binary

			const streamedBytes = await readStreamBuffer(resource.getContentStream());
			streamedBytes.should.be.eql(originalBytes);
		});
	});

	describe('#clearContent', function () {
		it('should clear text and content stream', function () {
			const resource = new Resource('http://example.com');
			resource.setText('some text');
			resource.setContentStream(Readable.from('stream'));

			resource.clearContent();

			should.not.exist(resource.getText());
			should.not.exist(resource.getContentStream());
		});
	});
});
