import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import sinon from 'sinon';
import scrape from 'website-scraper';
import Scraper from '../../../lib/scraper.js';

const testDirname = './test/functional/error-handling/.tmp';
const mockDirname = './test/functional/error-handling/mocks';

describe('Functional error handling', function() {
	const options = {
		urls: [ 'http://example.com/' ],
		directory: testDirname,
		subdirectories: null,
		recursive: true,
		maxDepth: 2,
		sources: []
	};

	beforeEach(function () {
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

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	describe('FS Error', function () {
		let saveResourceStub, handleErrorStub, failingFsPlugin;

		beforeEach(function() {
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

		it('should remove directory and immediately reject on fs error if ignoreErrors is false', function () {
			const scraperOptions = {
				...options,
				ignoreErrors: false,
				plugins: [
					failingFsPlugin
				]
			};

			return scrape(scraperOptions).then(function() {
				should(true).be.eql(false);
			}).catch(function (err) {
				should(err.message).be.eql('FS FAILED!');
				should(saveResourceStub.callCount).be.eql(3);
				should(handleErrorStub.callCount).be.eql(1);
			});
		});

		it('should ignore fs error if ignoreErrors is true', function () {
			const scraperOptions = {
				...options,
				ignoreErrors: true,
				plugins: [
					failingFsPlugin
				]
			};

			return scrape(scraperOptions).then(function() {
				should(saveResourceStub.callCount).be.eql(7);
				should(handleErrorStub.callCount).be.eql(0);
			});
		});
	});

	describe('Resource Handler Error', function () {
		let scraper;
		let handleResourceStub;

		beforeEach(function() {
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

		it('should remove directory and immediately reject on resource handler error if ignoreErrors is false', function () {
			scraper.options.ignoreErrors = false;

			return scraper.scrape().then(function() {
				should(true).be.eql(false);
			}).catch(function (err) {
				fs.existsSync(testDirname).should.be.eql(false);
				should(err.message).be.eql('RESOURCE HANDLER FAILED!');
				should(handleResourceStub.callCount).be.eql(4);
			});
		});

		it('should ignore resource handler error if ignoreErrors is true', function () {
			scraper.options.ignoreErrors = true;

			return scraper.scrape().then(function() {
				should(handleResourceStub.callCount).be.eql(7);
				fs.existsSync(testDirname).should.be.eql(true);
			});
		});
	});
});
