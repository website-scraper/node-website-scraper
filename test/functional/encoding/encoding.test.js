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
		scrapedIndex.should.contain('<div id="special-characters-korean">\uc800\ub294 7\ub144 \ub3d9\uc548 \ud55c\uad6d\uc5d0\uc11c \uc0b4\uc558\uc5b4\uc694.</div>');
		scrapedIndex.should.contain('<div id="special-characters-ukrainian">\u0421\u043b\u0430\u0432\u0430 \u0423\u043a\u0440\u0430\u0457\u043d\u0456!</div>');
		scrapedIndex.should.contain('<div id="special-characters-chinese">\u52a0\u5165\u7f51\u7ad9</div>');
		scrapedIndex.should.contain('<div id="special-characters-ukrainian">\u041e\u0431\u043b\u0430\u0434\u043d\u0430\u043d\u043d\u044f \u0442\u0430 \u041f\u0417</div>');
		scrapedIndex.should.contain('<div id="special-characters-french">PAR PASSION DU V\u00c9LO</div>');
	});

	it('should save the page with enconding from html meta tag', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/with-charset.html', {'content-type': 'text/html'});

		await scrape(options);

		const scrapedIndex = await fs.readFile(testDirname + '/index.html', { encoding: 'utf8' });
		scrapedIndex.should.contain('<div id="special-characters-korean">\uc800\ub294 7\ub144 \ub3d9\uc548 \ud55c\uad6d\uc5d0\uc11c \uc0b4\uc558\uc5b4\uc694.</div>');
		scrapedIndex.should.contain('<div id="special-characters-ukrainian">\u0421\u043b\u0430\u0432\u0430 \u0423\u043a\u0440\u0430\u0457\u043d\u0456!</div>');
		scrapedIndex.should.contain('<div id="special-characters-chinese">\u52a0\u5165\u7f51\u7ad9</div>');
		scrapedIndex.should.contain('<div id="special-characters-ukrainian">\u041e\u0431\u043b\u0430\u0434\u043d\u0430\u043d\u043d\u044f \u0442\u0430 \u041f\u0417</div>');
		scrapedIndex.should.contain('<div id="special-characters-french">PAR PASSION DU V\u00c9LO</div>');
	});
});
