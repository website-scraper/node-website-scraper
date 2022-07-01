import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/recursive/.tmp';
const mockDirname = './test/functional/recursive/mocks';

describe('Functional recursive downloading', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should follow anchors if recursive flag is set', async () => {
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

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);

		// index.html anchors loaded (depth 1)
		await `${testDirname}/about.html`.should.fileExists(true);

		// about.html anchors loaded (depth 2)
		await `${testDirname}/link1.html`.should.fileExists(true);
		await `${testDirname}/link2.html`.should.fileExists(true);
		await `${testDirname}/link3.html`.should.fileExists(true);
	});

	it('should follow anchors with depth <= maxDepth if recursive flag and maxDepth are set', async () => {
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

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);

		// index.html anchors loaded (depth 1)
		await `${testDirname}/about.html`.should.fileExists(true);

		// about.html anchors loaded (depth 2)
		await `${testDirname}/link1.html`.should.fileExists(true);
		await `${testDirname}/link2.html`.should.fileExists(true);
		await `${testDirname}/link3.html`.should.fileExists(true);

		// link1.html anchors NOT loaded (depth 3)
		await `${testDirname}/link1-1.html`.should.fileExists(false);
		await `${testDirname}/link1-2.html`.should.fileExists(false);
	});

	it('should not follow anchors if recursive flag is not set', async () => {
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

		await scrape(options);
		await `${testDirname}/index.html`.should.fileExists(true);

		// index.html anchors NOT loaded (depth 1)
		await `${testDirname}/about.html`.should.fileExists(false);

		// about.html anchors NOT loaded (depth 2)
		await `${testDirname}/link1.html`.should.fileExists(false);
		await `${testDirname}/link2.html`.should.fileExists(false);
		await `${testDirname}/link3.html`.should.fileExists(false);
	});
});
