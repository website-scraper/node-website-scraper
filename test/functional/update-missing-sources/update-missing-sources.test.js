import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/update-missing-sources/.tmp';
const mockDirname = './test/functional/update-missing-sources/mocks';

class UpdateMissingResourceReferencePlugin {
	apply (registerAction) {
		let getUrl;

		registerAction('beforeStart', ({utils}) => {
			getUrl = utils.getUrl;
		});

		registerAction('getReference', ({resource, parentResource, originalReference}) => {
			if (!resource) {
				return { reference: getUrl(parentResource.url, originalReference) }
			}

			return {reference: resource.getFilename()};
		});
	}
}

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

	it('should not update missing sources by default', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }]
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

	it('should update missing sources if missing resource plugin added', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }],
			plugins: [ new UpdateMissingResourceReferencePlugin() ],
			ignoreErrors: true
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

	it('should update missing sources when source was rejected by urlFilter', () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }],
			plugins: [ new UpdateMissingResourceReferencePlugin() ],
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
			plugins: [ new UpdateMissingResourceReferencePlugin() ],
			ignoreErrors: false
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
			plugins: [ new UpdateMissingResourceReferencePlugin() ],
			ignoreErrors: true
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
});

