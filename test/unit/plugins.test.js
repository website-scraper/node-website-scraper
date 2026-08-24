import * as chai from 'chai';
chai.should();
import fs from 'fs';
import { Readable } from 'stream';
import SaveResourceToFileSystemPlugin from '../../lib/plugins/save-resource-to-fs-plugin.js';
import Resource from '../../lib/resource.js';

const testDirname = './test/unit/.plugins-test';

function applyPlugin (plugin) {
	const actions = {};
	plugin.apply((name, handler) => actions[name] = handler);
	return actions;
}

describe('SaveResourceToFileSystemPlugin', () => {
	afterEach(() => {
		fs.rmSync(testDirname, {recursive: true, force: true});
	});

	describe('beforeStart', () => {
		it('should throw if directory is not a string', () => {
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			(() => actions.beforeStart({options: {directory: null}})).should.throw('Incorrect directory');
			(() => actions.beforeStart({options: {directory: 42}})).should.throw('Incorrect directory');
		});

		it('should throw if directory already exists', () => {
			fs.mkdirSync(testDirname, {recursive: true});
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			(() => actions.beforeStart({options: {directory: testDirname}})).should.throw(/Directory (.*?) exists/);
		});
	});

	describe('saveResource', () => {
		it('should save content stream to file creating nested directories', async () => {
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			actions.beforeStart({options: {directory: testDirname}});

			const resource = new Resource('http://example.com/a.png', 'images/nested/a.png');
			const content = Buffer.from([0xff, 0x00, 0xab, 0x10]);
			resource.setContentStream(Readable.from(content));

			await actions.saveResource({resource});

			fs.readFileSync(testDirname + '/images/nested/a.png').should.be.eql(content);
		});

		it('should save buffered text resources using resource encoding', async () => {
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			actions.beforeStart({options: {directory: testDirname}});

			const resource = new Resource('http://example.com/', 'index.html');
			resource.setEncoding('utf8');
			resource.setText('<html>тест</html>');

			await actions.saveResource({resource});

			fs.readFileSync(testDirname + '/index.html').toString('utf8').should.be.eql('<html>тест</html>');
		});

		it('should remove partially written file and rethrow when stream errors', async () => {
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			actions.beforeStart({options: {directory: testDirname}});

			const resource = new Resource('http://example.com/a.png', 'a.png');
			resource.setContentStream(new Readable({
				read () {
					this.push('partial data');
					this.destroy(new Error('mid-stream failure'));
				}
			}));

			try {
				await actions.saveResource({resource});
				throw new Error('expected saveResource to reject');
			} catch (err) {
				err.message.should.be.eql('mid-stream failure');
			}
			fs.existsSync(testDirname + '/a.png').should.be.eql(false);
		});
	});

	describe('error', () => {
		it('should remove directory if resources were saved', async () => {
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			actions.beforeStart({options: {directory: testDirname}});

			const resource = new Resource('http://example.com/', 'index.html');
			resource.setContentStream(Readable.from('content'));
			await actions.saveResource({resource});
			fs.existsSync(testDirname).should.be.eql(true);

			await actions.error();

			fs.existsSync(testDirname).should.be.eql(false);
		});

		it('should not throw if nothing was saved', async () => {
			const actions = applyPlugin(new SaveResourceToFileSystemPlugin());
			actions.beforeStart({options: {directory: testDirname}});

			await actions.error();

			fs.existsSync(testDirname).should.be.eql(false);
		});
	});
});
