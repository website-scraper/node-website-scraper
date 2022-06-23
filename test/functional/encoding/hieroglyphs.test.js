import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/encoding/.tmp';
const mockDirname = './test/functional/encoding/mocks';

describe('Functional: UTF8 characters are properly encoded/decoded', () => {
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

	beforeEach(() => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html; charset=utf-8'});
	});

	it('should save the page in the same data as it was originally', async () => {
		await scrape(options);

		const scrapedIndex = await fs.readFile(testDirname + '/index.html', { encoding: 'utf8' });
		scrapedIndex.should.be.containEql('<div id="special-characters-korean">저는 7년 동안 한국에서 살았어요.</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Слава Україні!</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-chinese">加入网站</div>');
		scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Обладнання та ПЗ</div>');
	});
});
