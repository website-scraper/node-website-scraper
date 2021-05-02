import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/recursive/.tmp';
const mockDirname = './test/functional/recursive/mocks';

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
		const options = {
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

	it('should follow anchors with depth <= maxDepth if recursive flag and maxDepth are set', function () {
		const options = {
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
		const options = {
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
