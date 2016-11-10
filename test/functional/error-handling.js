var should = require('should');
var nock = require('nock');
var sinon = require('sinon');
require('sinon-as-promised');
var fs = require('fs-extra');
var Scraper = require('../../lib/scraper');

var testDirname = __dirname + '/.error-handling';
var mockDirname = __dirname + '/mocks/error-handling';

describe('Functional error handling', function() {

	beforeEach(function () {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should remove directory and immediately reject on fs error', function () {
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			recursive: true,
			maxDepth: 1,
			sources: []
		};

		var scraper = new Scraper(options);
		scraper.fsAdapter.loadedResources = [ 1, 2, 3];
		var loadToFsStub = sinon.stub(scraper.fsAdapter, 'saveResource').resolves();
		loadToFsStub.onCall(3).rejects(new Error('FS FAILED!'));

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/page1.html').reply(200, 'ok');
		nock('http://example.com/').get('/page2.html').reply(200, 'ok');
		nock('http://example.com/').get('/page3.html').reply(200, 'ok');
		nock('http://example.com/').get('/page4.html').reply(200, 'ok');
		nock('http://example.com/').get('/page5.html').reply(200, 'ok');
		nock('http://example.com/').get('/page6.html').reply(200, 'ok');

		return scraper.scrape(options).then(function() {
			should(true).be.eql(false);
		}).catch(function (err) {
			fs.existsSync(testDirname).should.be.eql(false);
			should(err.message).be.eql('FS FAILED!');
		});
	});
});
