import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/circular-dependencies/.tmp';
const mockDirname = './test/functional/circular-dependencies/mocks';

describe('Functional circular dependencies', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should correctly load files with circular dependency', async () => {
		const options = {
			urls: [
				{ url: 'http://example.com/index.html', filename: 'index.html'},
				{ url: 'http://example.com/about.html', filename: 'about.html'}
			],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{selector: 'a', attr: 'href'},
				{selector: 'link', attr: 'href'}
			]
		};

		nock('http://example.com/').get('/index.html').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/style.css').replyWithFile(200, mockDirname + '/style.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/style2.css').replyWithFile(200, mockDirname + '/style2.css', {'content-type': 'text/css'});

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/about.html`.should.fileExists(true);
		await `${testDirname}/style.css`.should.fileExists(true);
		await `${testDirname}/style2.css`.should.fileExists(true);
	});

});
