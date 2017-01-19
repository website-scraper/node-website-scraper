require('should');
var nock = require('nock');
var fs = require('fs-extra');
var sinon = require('sinon');
var Scraper = require('../../../lib/scraper');

var testDirname = __dirname + '/.tmp';
var mockDirname = __dirname + '/mocks';

describe('Functional redirects', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should follow redirects and save resource once if it has different urls', function() {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		// true page - ok
		nock('http://example.com/').get('/true-page.html').reply(200, 'true page 1');
		// duplicating page - redirect to true page
		nock('http://example.com/').get('/duplicating-page.html').reply(302, '', {'Location': 'http://example.com/true-page.html'});
		nock('http://example.com/').get('/true-page.html').reply(200, 'true page 2');
		// duplicating site - redirect to duplicating page, then redirect to true page
		nock('http://duplicating.another-site.com/').get('/').reply(302, '', {'Location': 'http://example.com/duplicating-page.html'});
		nock('http://example.com/').get('/duplicating-page.html').reply(302, '', {'Location': 'http://example.com/true-page.html'});
		nock('http://example.com/').get('/true-page.html').reply(200, 'true page 3');

		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			recursive: true,
			maxDepth: 2,
			sources: []
		};
		var scraper = new Scraper(options);
		var loadToFsSpy = sinon.spy(scraper.fsAdapter, 'saveResource');

		return scraper.scrape().then(function() {
			loadToFsSpy.callCount.should.be.eql(2);
			loadToFsSpy.args[0][0].filename.should.be.eql('index.html');
			loadToFsSpy.args[1][0].filename.should.be.eql('true-page.html');

			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/true-page.html').should.be.eql(true);

			// should update all urls to true-page.html
			fs.readFileSync(testDirname + '/index.html').toString().should.containEql('<a href="true-page.html">1</a>');
			fs.readFileSync(testDirname + '/index.html').toString().should.containEql('<a href="true-page.html">2</a>');
			fs.readFileSync(testDirname + '/index.html').toString().should.containEql('<a href="true-page.html">3</a>');

			// true-page.html should have body from 1st response
			fs.readFileSync(testDirname + '/true-page.html').toString().should.be.eql('true page 1');
		});
	});
});
