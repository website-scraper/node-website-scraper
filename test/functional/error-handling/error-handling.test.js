var should = require('should');
var nock = require('nock');
var sinon = require('sinon');
require('sinon-as-promised');
var fs = require('fs-extra');
var Promise = require('bluebird');
var Scraper = require('../../../lib/scraper');

var testDirname = __dirname + '/.tmp';
var mockDirname = __dirname + '/mocks';
var scraper;

describe('Functional error handling', function() {

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

		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			recursive: true,
			maxDepth: 2,
			sources: []
		};
		scraper = new Scraper(options);
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	describe('FS Error', function () {
		var loadToFsStub;

		beforeEach(function() {
			scraper.fsAdapter.loadedResources = [1, 2];
			loadToFsStub = sinon.stub(scraper.fsAdapter, 'saveResource').resolves();
			loadToFsStub.onCall(2).rejects(new Error('FS FAILED!'));
		});

		it('should remove directory and immediately reject on fs error if ignoreErrors is false', function () {
			scraper.options.ignoreErrors = false;

			return scraper.scrape().then(function() {
				should(true).be.eql(false);
			}).catch(function (err) {
				fs.existsSync(testDirname).should.be.eql(false);
				should(err.message).be.eql('FS FAILED!');
				should(loadToFsStub.callCount).be.eql(3);
			});
		});

		it('should ignore fs error if ignoreErrors is true', function () {
			scraper.options.ignoreErrors = true;

			return scraper.scrape().then(function() {
				should(loadToFsStub.callCount).be.eql(7);
				fs.existsSync(testDirname).should.be.eql(true);
			});
		});
	});

	describe('Resource Handler Error', function () {
		var handleResourceStub;

		beforeEach(function() {
			var originalHandleResource = scraper.resourceHandler.handleResource;
			var callCount = 0;
			handleResourceStub = sinon.stub(scraper.resourceHandler, 'handleResource', function() {
				if (callCount++ === 3) {
					return Promise.reject(new Error('RESOURCE HANDLER FAILED!'));
				}
				return originalHandleResource.apply(scraper.resourceHandler, arguments);
			});
		});

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
