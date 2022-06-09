import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/encoding/.tmp';
const mockDirname = './test/functional/encoding/mocks';

describe('Functional: Korean characters are properly encoded/decoded', function() {
	const options = {
		urls: [
			'http://example.com/',
		],
		directory: testDirname,
		ignoreErrors: false
	};

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	beforeEach(() => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
	});

	it('should save the page in the same data as it was originally', () => {
		return scrape(options).then(function(result) {
			const scrapedIndex = fs.readFileSync(testDirname + '/index.html').toString();
			scrapedIndex.should.be.containEql('<div id="special-characters-korean">저는 7년 동안 한국에서 살았어요.</div>');
			scrapedIndex.should.be.containEql('<div id="special-characters-ukrainian">Слава Україні!</div>');
			scrapedIndex.should.be.containEql('<div id="special-characters-chinese">加入网站</div>');
		});
	});
});
