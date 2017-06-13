require('should');
const nock = require('nock');
const fs = require('fs-extra');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';
const mockDirname = __dirname + '/mocks';

describe('Functional: update missing sources', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should not update missing sources if updateMissingSources = false', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }],
			updateMissingSources: false
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').replyWithError('COULDN\'T DOWNLOAD IMAGE');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/missing-img.png').should.be.eql(false);


			const indexBody = fs.readFileSync(testDirname + '/index.html').toString();
			indexBody.should.containEql('<img src="/missing-img.png"');
		});
	});

	it('should update missing sources if updateMissingSources = true', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }],
			updateMissingSources: true
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').replyWithError('COULDN\'T DOWNLOAD IMAGE');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/missing-img.png').should.be.eql(false);


			const indexBody = fs.readFileSync(testDirname + '/index.html').toString();
			indexBody.should.containEql('<img src="http://example.com/missing-img.png"');
		});
	});

	it('should update missing sources if updateMissingSources = array of sources', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'script', attr: 'src' }
			],
			updateMissingSources: [
				{ selector: 'img', attr: 'src' }
			]
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').replyWithError('COULDN\'T DOWNLOAD IMAGE');
		nock('http://example.com/').get('/missing-script.js').replyWithError('COULDN\'T DOWNLOAD SCRIPT');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/missing-img.png').should.be.eql(false);
			fs.existsSync(testDirname + '/missing-script.js').should.be.eql(false);


			const indexBody = fs.readFileSync(testDirname + '/index.html').toString();
			indexBody.should.containEql('<img src="http://example.com/missing-img.png"');
			indexBody.should.containEql('<script src="/missing-script.js"');
		});
	});

	it('should update missing sources when source was rejected by urlFilter', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }],
			updateMissingSources: true,
			urlFilter: function (url) {
				return url.indexOf('/missing-img.png') === -1;
			}
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').reply(200, 'ok');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/missing-img.png').should.be.eql(false);


			const indexBody = fs.readFileSync(testDirname + '/index.html').toString();
			indexBody.should.containEql('<img src="http://example.com/missing-img.png"');
		});
	});

	it('should update missing sources when source was rejected by maxRecursiveDepth', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			recursive: true,
			maxRecursiveDepth: 1,
			updateMissingSources: true,
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/link1.html').replyWithFile(200, mockDirname + '/link1.html');
		nock('http://example.com/').get('/missing-link.html').reply(200, 'ok');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/link1.html').should.be.eql(true);
			fs.existsSync(testDirname + '/missing-link.html').should.be.eql(false);


			const link = fs.readFileSync(testDirname + '/link1.html').toString();
			link.should.containEql('<a href="http://example.com/missing-link.html"');
		});
	});

	it('should update missing sources if one of pathContainers path was failed', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{selector: 'style'}],
			updateMissingSources: true,
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/path-containers.html');
		nock('http://example.com/').get('/a.png').reply(200, 'ok');
		nock('http://example.com/').get('/b.png').replyWithError('Failed!');
		nock('http://example.com/').get('/c.png').reply(200, 'ok');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/a.png').should.be.eql(true);
			fs.existsSync(testDirname + '/b.png').should.be.eql(false);
			fs.existsSync(testDirname + '/c.png').should.be.eql(true);


			const index = fs.readFileSync(testDirname + '/index.html').toString();
			index.should.containEql(`.a { background: url('a.png') }`);
			index.should.containEql(`.b { background: url('http://example.com/b.png') }`);
			index.should.containEql(`.c { background: url('c.png') }`);
		});
	});

	it('should update all and download nothing', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [],
			updateMissingSources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'script', attr: 'src' },
				{ selector: 'a', attr: 'href' },
			]
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').reply(200, 'ok');
		nock('http://example.com/').get('/missing-script.js').reply(200, 'ok');
		nock('http://example.com/').get('/link1.html').reply(200, 'ok');

		return scrape(options).then(() => {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/missing-img.png').should.be.eql(false);
			fs.existsSync(testDirname + '/missing-script.js').should.be.eql(false);
			fs.existsSync(testDirname + '/link1.html').should.be.eql(false);


			const indexBody = fs.readFileSync(testDirname + '/index.html').toString();
			indexBody.should.containEql('<img src="http://example.com/missing-img.png"');
			indexBody.should.containEql('<script src="http://example.com/missing-script.js"');
			indexBody.should.containEql('<a href="http://example.com/link1.html"');
		});
	})

});

