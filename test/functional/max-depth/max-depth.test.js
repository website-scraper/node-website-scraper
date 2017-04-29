require('should');
const nock = require('nock');
const fs = require('fs-extra');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';
const mockDirname = __dirname + '/mocks';

describe('Functional: maxDepth and maxRecursiveDepth ', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should filter out all resources by depth > maxDepth', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'script', attr: 'src' },
				{ selector: 'a', attr: 'href' }
			],
			maxDepth: 2
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		nock('http://example.com/').get('/depth1.html').replyWithFile(200, mockDirname + '/depth1.html');
		nock('http://example.com/').get('/img-depth1.jpg').reply(200, 'img-depth1.jpg');
		nock('http://example.com/').get('/script-depth1.js').reply(200, 'script-depth1.js');

		nock('http://example.com/').get('/depth2.html').replyWithFile(200, mockDirname + '/depth2.html');
		nock('http://example.com/').get('/img-depth2.jpg').reply(200, 'img-depth2.jpg');
		nock('http://example.com/').get('/script-depth2.js').reply(200, 'script-depth2.js');

		nock('http://example.com/').get('/depth3.html').reply(200, 'OK');
		nock('http://example.com/').get('/img-depth3.jpg').reply(200, 'img-depth3.jpg');
		nock('http://example.com/').get('/script-depth3.js').reply(200, 'script-depth3.js');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			fs.existsSync(testDirname + '/depth1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/img-depth1.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/script-depth1.js').should.be.eql(true);

			fs.existsSync(testDirname + '/depth2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/img-depth2.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/script-depth2.js').should.be.eql(true);

			fs.existsSync(testDirname + '/depth3.html').should.be.eql(false);
			fs.existsSync(testDirname + '/img-depth3.jpg').should.be.eql(false);
			fs.existsSync(testDirname + '/script-depth3.js').should.be.eql(false);
		});
	});


	it('should filter out only anchors by depth > maxRecursiveDepth', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'script', attr: 'src' },
				{ selector: 'a', attr: 'href' }
			],
			maxRecursiveDepth: 2
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		nock('http://example.com/').get('/depth1.html').replyWithFile(200, mockDirname + '/depth1.html');
		nock('http://example.com/').get('/img-depth1.jpg').reply(200, 'img-depth1.jpg');
		nock('http://example.com/').get('/script-depth1.js').reply(200, 'script-depth1.js');

		nock('http://example.com/').get('/depth2.html').replyWithFile(200, mockDirname + '/depth2.html');
		nock('http://example.com/').get('/img-depth2.jpg').reply(200, 'img-depth2.jpg');
		nock('http://example.com/').get('/script-depth2.js').reply(200, 'script-depth2.js');

		nock('http://example.com/').get('/depth3.html').reply(200, 'OK');
		nock('http://example.com/').get('/img-depth3.jpg').reply(200, 'img-depth3.jpg');
		nock('http://example.com/').get('/script-depth3.js').reply(200, 'script-depth3.js');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);

			fs.existsSync(testDirname + '/depth1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/img-depth1.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/script-depth1.js').should.be.eql(true);

			fs.existsSync(testDirname + '/depth2.html').should.be.eql(true);
			fs.existsSync(testDirname + '/img-depth2.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/script-depth2.js').should.be.eql(true);

			fs.existsSync(testDirname + '/depth3.html').should.be.eql(false);
			// img-depth3.jpg and script-depth3.js - dependencies of depth2.html
			// they should be loaded because maxRecursiveDepth applies only to <a href=''>
			fs.existsSync(testDirname + '/img-depth3.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/script-depth3.js').should.be.eql(true);
		});
	});

});
