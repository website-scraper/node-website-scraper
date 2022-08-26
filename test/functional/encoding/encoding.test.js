import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/encoding/.tmp';
const mockDirname = './test/functional/encoding/mocks';

describe('Functional: encoding', () => {
	const options = {
		urls: [
			'http://example.com/',
		],
		directory: testDirname,
		ignoreErrors: false
	};

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should save the page with enconding from http response headers', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/without-charset.html', {'content-type': 'text/html; charset=utf-8'});

		await scrape(options);

		const scrapedIndex = await fs.readFile(testDirname + '/index.html', { encoding: 'utf8' });
		scrapedIndex.should.be.containEql('<div id="special-characters-korean">저는 7년 동안 한국에서 살았어요.</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Слава Україні!</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-chinese">加入网站</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Обладнання та ПЗ</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-french">PAR PASSION DU VÉLO</div>');
	});

	it('should save the page with enconding from html meta tag', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/with-charset.html', {'content-type': 'text/html'});

		await scrape(options);

		const scrapedIndex = await fs.readFile(testDirname + '/index.html', { encoding: 'utf8' });
		scrapedIndex.should.be.containEql('<div id="special-characters-korean">저는 7년 동안 한국에서 살았어요.</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Слава Україні!</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-chinese">加入网站</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Обладнання та ПЗ</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-french">PAR PASSION DU VÉLO</div>');
	});
});
