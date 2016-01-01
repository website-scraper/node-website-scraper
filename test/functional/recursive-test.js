require('should');
var nock = require('nock');
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var scraper = require('../../index');

var testDirname = __dirname + '/.recursive';
var mockDirname = __dirname + '/mocks/recursive';

describe('Functional recursive downloading', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should follow anchors', function(done) {
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			recursive: true
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for anchors
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html');
		nock('http://example.com/').get('/link1.html').reply(200, 'content 1');
		nock('http://example.com/').get('/link2.html').reply(200, 'content 2');
		nock('http://example.com/').get('/link3.html').reply(200, 'content 3');

		scraper.scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			// index.html anchors loaded
			fs.existsSync(testDirname + '/about.html').should.be.eql(true);

			// about.html anchors loaded
			fs.existsSync(testDirname + '/link1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link3.html').should.be.eql(true);

			done();
		}).catch(done);
	});
});
