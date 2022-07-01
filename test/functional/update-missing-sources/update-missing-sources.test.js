import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
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

	beforeEach(async () => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should not update missing sources by default', async () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }]
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').replyWithError('COULDN\'T DOWNLOAD IMAGE');

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/missing-img.png`.should.fileExists(false);

		const indexBody = (await fs.readFile(testDirname + '/index.html')).toString();
		indexBody.should.containEql('<img src="/missing-img.png"');
	});

	it('should update missing sources if missing resource plugin added', async () => {
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

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/missing-img.png`.should.fileExists(false);

		const indexBody = (await fs.readFile(testDirname + '/index.html')).toString();
		indexBody.should.containEql('<img src="http://example.com/missing-img.png"');
	});

	it('should update missing sources when source was rejected by urlFilter', async () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [{ selector: 'img', attr: 'src' }],
			plugins: [ new UpdateMissingResourceReferencePlugin() ],
			urlFilter: (url) => {
				return url.indexOf('/missing-img.png') === -1;
			}
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/missing-img.png').reply(200, 'ok');

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/missing-img.png`.should.fileExists(false);

		const indexBody = (await fs.readFile(testDirname + '/index.html')).toString();
		indexBody.should.containEql('<img src="http://example.com/missing-img.png"');
	});

	it('should update missing sources when source was rejected by maxRecursiveDepth', async () => {
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

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/link1.html`.should.fileExists(true);
		await `${testDirname}/missing-link.html`.should.fileExists(false);

		const indexBody = (await fs.readFile(testDirname + '/link1.html')).toString();
		indexBody.should.containEql('<a href="http://example.com/missing-link.html"');
	});

	it('should update missing sources if one of pathContainers path was failed', async () => {
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

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/a.png`.should.fileExists(true);
		await `${testDirname}/b.png`.should.fileExists(false);
		await `${testDirname}/c.png`.should.fileExists(true);

		const index = (await fs.readFile(testDirname + '/index.html', { encoding: 'binary' }));
		index.should.containEql(`.a { background: url('a.png') }`);
		index.should.containEql(`.b { background: url('http://example.com/b.png') }`);
		index.should.containEql(`.c { background: url('c.png') }`);
	});
});

