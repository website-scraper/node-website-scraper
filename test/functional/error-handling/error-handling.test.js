import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import sinon from 'sinon';
import scrape from 'website-scraper';
import Scraper from '../../../lib/scraper.js';

const testDirname = './test/functional/error-handling/.tmp';
const mockDirname = './test/functional/error-handling/mocks';

describe('Functional error handling', () => {
	const options = {
		urls: [ 'http://example.com/' ],
		directory: testDirname,
		subdirectories: null,
		recursive: true,
		maxDepth: 2,
		sources: []
	};

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/page1.html').delay(100).reply(200, 'ok');
		nock('http://example.com/').get('/page2.html').delay(200).reply(200, 'ok');
		nock('http://example.com/').get('/page3.html').delay(300).reply(200, 'ok');
		nock('http://example.com/').get('/page4.html').delay(400).reply(200, 'ok');
		nock('http://example.com/').get('/page5.html').delay(500).reply(200, 'ok');
		nock('http://example.com/').get('/page6.html').delay(600).reply(200, 'ok');
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	describe('FS Error', () => {
		let saveResourceStub, handleErrorStub, failingFsPlugin;

		beforeEach(() => {
			saveResourceStub = sinon.stub().resolves().onCall(2).rejects(new Error('FS FAILED!'));
			handleErrorStub = sinon.stub().resolves();

			class FailingFSPlugin {
				apply(registerAction) {
					registerAction('saveResource', saveResourceStub);
					registerAction('error', handleErrorStub)
				}
			}

			failingFsPlugin = new FailingFSPlugin();
		});

		it('should remove directory and immediately reject on fs error if ignoreErrors is false', () => {
			const scraperOptions = {
				...options,
				ignoreErrors: false,
				plugins: [
					failingFsPlugin
				]
			};

			return scrape(scraperOptions).then(() => {
				should(true).be.eql(false);
			}).catch(function (err) {
				should(err.message).be.eql('FS FAILED!');
				should(saveResourceStub.callCount).be.eql(3);
				should(handleErrorStub.callCount).be.eql(1);
			});
		});

		it('should ignore fs error if ignoreErrors is true', () => {
			const scraperOptions = {
				...options,
				ignoreErrors: true,
				plugins: [
					failingFsPlugin
				]
			};

			return scrape(scraperOptions).then(() => {
				should(saveResourceStub.callCount).be.eql(7);
				should(handleErrorStub.callCount).be.eql(0);
			});
		});
	});

	describe('Resource Handler Error', () => {
		let scraper;
		let handleResourceStub;

		beforeEach(() => {
			scraper = new Scraper(options);
			const originalHandleResource = scraper.resourceHandler.handleResource;
			let callCount = 0;
			handleResourceStub = sinon.stub(scraper.resourceHandler, 'handleResource').callsFake(function() {
				if (callCount++ === 3) {
					return Promise.reject(new Error('RESOURCE HANDLER FAILED!'));
				}
				return originalHandleResource.apply(scraper.resourceHandler, arguments);
			});
		});

		afterEach(() => {
			handleResourceStub.restore();
		})

		it('should remove directory and immediately reject on resource handler error if ignoreErrors is false', async () => {
			scraper.options.ignoreErrors = false;

			try {
				await scraper.scrape();
				should(true).be.eql(false);
			} catch (err) {
				await testDirname.should.dirExists(false);
				should(err.message).be.eql('RESOURCE HANDLER FAILED!');
				should(handleResourceStub.callCount).be.eql(4);
			}
		});

		it('should ignore resource handler error if ignoreErrors is true', async () => {
			scraper.options.ignoreErrors = true;

			await scraper.scrape();
			should(handleResourceStub.callCount).be.eql(7);
			await testDirname.should.dirExists(true);
		});
	});
});
