import 'should';
import Resource from '../../lib/resource.js';
import fs from 'fs/promises';
import '../utils/assertions.js';
import path from 'path';
import os from 'os';

describe('Resource', () => {
	describe('#createChild',  () => {
		it('should return Resource', () => {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.should.be.instanceOf(Resource);
		});

		it('should set correct url and filename', () => {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com', 'google.html');
			child.getUrl().should.be.eql('http://google.com');
			child.getFilename().should.equalFileSystemPath('google.html');
		});

		it('should set parent', () => {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.parent.should.be.equal(parent);
		});

		it('should set depth', () => {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.depth.should.be.eql(1);

			const childOfChild = child.createChild('http://google.com.ua');
			childOfChild.depth.should.be.eql(2);
		});
	});

	describe('set/get text', () => {
		const testString1 = '동안 한국에서';
		const testString2 = '加入网站';

		it('memory mode', async () => {
			const resource = new Resource('http://example.com', 'index.html', 'memory');
			resource.setEncoding('utf8');

			await resource.setText(testString1);
			(await resource.getText()).should.eql(testString1);

			await resource.setText(testString2);
			(await resource.getText()).should.eql(testString2);
		});

		it('memory-compressed mode', async () => {
			const resource = new Resource('http://example.com', 'index.html', 'memory-compressed');
			resource.setEncoding('utf8');

			await resource.setText(testString1);
			(await resource.getText()).should.eql(testString1);
			(await resource._memoryRead()).should.not.eql(testString1);

			await resource.setText(testString2);
			(await resource.getText()).should.eql(testString2);
		});

		it('filesystem mode', async () => {
			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-scraper-'));

			try {
				const resource = new Resource('http://example.com', 'index.html', 'filesystem', tmpDir);
				resource.setEncoding('utf8');

				await resource.setText(testString1);
				(await resource.getText()).should.eql(testString1);

				await resource.setText(testString2);
				(await resource.getText()).should.eql(testString2);
			} finally {
				await fs.rm(tmpDir, { recursive: true, force: true });
			}
		});
	});
});
