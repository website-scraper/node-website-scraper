require('should');
var nock = require('nock');
var fs = require('fs-extra');
var scrape = require('../../../index');

var mockDirname = __dirname + '/mocks';
var testDirname = __dirname + '/.tmp';

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

	it('should follow anchors if recursive flag is set', function () {
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			recursive: true,
			replaceLinks: true,
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for anchors
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html');
		nock('http://example.com/').get('/link1.html').reply(200, 'content 1');
		nock('http://example.com/').get('/link2.html').reply(200, 'content 2');
		nock('http://example.com/').get('/link3.html').reply(200, 'content 3');
		nock('http://example.com/').get('/data/data.html').replyWithFile(200, mockDirname + '/data.html');

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			// index.html anchors loaded
			fs.existsSync(testDirname + '/about.html').should.be.eql(true);

			// about.html anchors loaded
			fs.existsSync(testDirname + '/link1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link3.html').should.be.eql(true);
		});
	});

	it('should follow anchors if recursive flag is set and links not replaced', function () {
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			recursive: true,
			replaceLinks: false,
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for anchors
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html');
		nock('http://example.com/').get('/link1.html').reply(200, 'content 1');
		nock('http://example.com/').get('/link2.html').reply(200, 'content 2');
		nock('http://example.com/').get('/link3.html').reply(200, 'content 3');
		nock('http://example.com/').get('/data/data.html').replyWithFile(200, mockDirname + '/data.html');

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			fs.readFileSync(testDirname + '/data.html').toString().should.eql(
				fs.readFileSync(mockDirname + '/data.html').toString());

			fs.readFileSync(testDirname + '/index.html').toString().should.eql(
				fs.readFileSync(mockDirname + '/index.html').toString());

			// index.html anchors loaded
			fs.existsSync(testDirname + '/about.html').should.be.eql(true);

			// about.html anchors loaded
			fs.existsSync(testDirname + '/link1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link3.html').should.be.eql(true);
		});
	});

	it('should follow anchors if recursive flag is set and custom filename generator follows exact site structure',
	    function () {
		var generateFilename = function (url) {
			var parsedUrl = new URL(url);
			var lastPath = parsedUrl.pathname.substring(parsedUrl.pathname.lastIndexOf("/")+1);
			if (lastPath.indexOf(".") == -1 && parsedUrl.search == "") {
				return parsedUrl.hostname + parsedUrl.pathname + "/index.html";
			}
			return parsedUrl.hostname + parsedUrl.pathname + parsedUrl.search;
		};
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			recursive: true,
			replaceLinks: false,
			filenameGenerator: (resource, options, occupiedFileNames) => {
				return generateFilename(resource.url);
			}
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for anchors
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html');
		nock('http://example.com/').get('/link1.html').reply(200, 'content 1');
		nock('http://example.com/').get('/link2.html').reply(200, 'content 2');
		nock('http://example.com/').get('/link3.html').reply(200, 'content 3');
		nock('http://example.com/').get('/data/data.html').replyWithFile(200, mockDirname + '/data.html');

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/example.com/index.html').should.be.eql(true);

			fs.readFileSync(testDirname + '/example.com/data/data.html').toString().should.eql(
				fs.readFileSync(mockDirname + '/data.html').toString());

			fs.readFileSync(testDirname + '/example.com/index.html').toString().should.eql(
				fs.readFileSync(mockDirname + '/index.html').toString());

			// index.html anchors loaded
			fs.existsSync(testDirname + '/example.com/about.html').should.be.eql(true);

			// about.html anchors loaded
			fs.existsSync(testDirname + '/example.com/link1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/link2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/link3.html').should.be.eql(true);
		});
	});

	it('should follow anchors with depth <= maxDepth if recursive flag and maxDepth are set', function () {
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			recursive: true,
			maxDepth: 2
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for anchors with depth = 1 - dependencies of index.html
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html');

		// mock for anchors with depth = 2 - dependencies of about.html
		nock('http://example.com/').get('/link1.html').replyWithFile(200, mockDirname + '/link1.html');
		nock('http://example.com/').get('/link2.html').reply(200, 'content 2');
		nock('http://example.com/').get('/link3.html').reply(200, 'content 3');

		// mock for anchors with depth = 3 - dependencies of about.html
		nock('http://example.com/').get('/link1-1.html').reply(200, 'content 1-1');
		nock('http://example.com/').get('/link1-2.html').reply(200, 'content 1-2');

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			// index.html anchors loaded (depth 1)
			fs.existsSync(testDirname + '/about.html').should.be.eql(true);

			// about.html anchors loaded (depth 2)
			fs.existsSync(testDirname + '/link1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link3.html').should.be.eql(true);

			// link1.html anchors NOT loaded (depth 3)
			fs.existsSync(testDirname + '/link1-1.html').should.be.eql(false);
			fs.existsSync(testDirname + '/link1-2.html').should.be.eql(false);
		});
	});

	it('should not follow anchors if recursive flag is not set', function () {
		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: []
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for anchors
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html');
		nock('http://example.com/').get('/link1.html').reply(200, 'content 1');
		nock('http://example.com/').get('/link2.html').reply(200, 'content 2');
		nock('http://example.com/').get('/link3.html').reply(200, 'content 3');

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			// index.html anchors loaded
			fs.existsSync(testDirname + '/about.html').should.be.eql(false);

			// about.html anchors loaded
			fs.existsSync(testDirname + '/link1.html').should.be.eql(false);
			fs.existsSync(testDirname + '/link2.html').should.be.eql(false);
			fs.existsSync(testDirname + '/link3.html').should.be.eql(false);
		});
	});
});
