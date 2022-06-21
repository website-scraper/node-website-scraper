import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import sinon from 'sinon';
import scrape from 'website-scraper';
import Scraper from '../../../lib/scraper.js';

const testDirname = './test/functional/redirect/.tmp';
const mockDirname = './test/functional/redirect/mocks';

describe('Functional redirects', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should follow redirects and save resource once if it has different urls', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		// true page - ok
		nock('http://example.com/').get('/true-page.html').reply(200, '<html><head></head><body>true page 1</body></html>', {'content-type': 'text/html'});
		// duplicating page - redirect to true page
		nock('http://example.com/').get('/duplicating-page.html').reply(302, '', {'Location': 'http://example.com/true-page.html'});
		nock('http://example.com/').get('/true-page.html').reply(200, 'true page 2');
		// duplicating site - redirect to duplicating page, then redirect to true page
		nock('http://duplicating.another-site.com/').get('/').reply(302, '', {'Location': 'http://example.com/duplicating-page.html'});
		nock('http://example.com/').get('/duplicating-page.html').reply(302, '', {'Location': 'http://example.com/true-page.html'});
		nock('http://example.com/').get('/true-page.html').reply(200, 'true page 3', {'content-type': 'text/html'});

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			recursive: true,
			maxDepth: 2,
			sources: []
		};
		const scraper = new Scraper(options);
		const saveSpy = sinon.spy(scraper.actions.saveResource, [0]);

		await scraper.scrape();

		saveSpy.callCount.should.be.eql(2);
		saveSpy.args[0][0].resource.filename.should.be.eql('index.html');
		saveSpy.args[1][0].resource.filename.should.be.eql('true-page.html');

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/true-page.html`.should.fileExists(true);

		// should update all urls to true-page.html
		const index = await fs.readFile(testDirname + '/index.html', { encoding: 'binary' });
		index.should.containEql('<a href="true-page.html">1</a>');
		index.should.containEql('<a href="true-page.html">2</a>');
		index.should.containEql('<a href="true-page.html">3</a>');

		// true-page.html should have body from 1st response
		const truePage = await fs.readFile(testDirname + '/true-page.html', { encoding: 'binary' });
		truePage.should.be.eql('<html><head></head><body>true page 1</body></html>');
	});

	it('should correctly handle relative source in redirected page', async () => {
		const options = {
			urls: [
				{ url: 'http://example.com', filename: 'index.html'}
			],
			directory: testDirname,
			subdirectories: [
				{ directory: 'css', extensions: ['.css'] }
			],
			maxRecursiveDepth: 1,
			sources: [
				{selector: 'link', attr: 'href'},
				{selector: 'a', attr: 'href'}
			]
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/relative-resources-index.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/about').reply(301, '', {'Location': 'http://example.com/about/'});
		nock('http://example.com/').get('/about/').replyWithFile(200, mockDirname + '/relative-resources-about.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/style.css').reply(200, 'style.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/about/style.css').reply(200, 'about/style.css', {'content-type': 'text/css'});

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		await `${testDirname}/about.html`.should.fileExists(true);
		await `${testDirname}/css/style.css`.should.fileExists(true);
		await `${testDirname}/css/style_1.css`.should.fileExists(true);

		const style = await fs.readFile(testDirname + '/css/style.css', { encoding: 'binary' });
		style.should.be.eql('style.css');

		const style1 = await fs.readFile(testDirname + '/css/style_1.css', { encoding: 'binary' });
		style1.should.be.eql('about/style.css');

		const index = await fs.readFile(testDirname + '/index.html', { encoding: 'binary' });
		index.should.containEql('<link rel="stylesheet" type="text/css" href="css/style.css">');

		const about = await fs.readFile(testDirname + '/about.html', { encoding: 'binary' });
		about.should.containEql('<link rel="stylesheet" type="text/css" href="css/style.css">');
		about.should.containEql('<link rel="stylesheet" type="text/css" href="css/style_1.css">');
	});
});
