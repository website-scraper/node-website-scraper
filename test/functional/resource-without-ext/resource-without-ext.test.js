import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/resource-without-ext/.tmp';
const mockDirname = './test/functional/resource-without-ext/mocks';

describe('Functional resources without extensions', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should load resources without extensions with correct type and wrap with extensions', async () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'link[rel="stylesheet"]', attr: 'href' },
				{ selector: 'a', attr: 'href' },
				{ selector: 'iframe', attr: 'src' }
			]
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		// mock for css fonts
		nock('http://fonts.googleapis.com/').get('/css?family=Lato').replyWithFile(200, mockDirname + '/fonts.css', {
			'content-type': 'text/css'
		});
		nock('http://fonts.gstatic.com/').get('/s/lato/v11/UyBMtLsHKBKXelqf4x7VRQ.woff2').reply(200, 'OK');
		nock('http://fonts.gstatic.com/').get('/s/lato/v11/1YwB1sO8YE1Lyjf12WNiUA.woff2').reply(200, 'OK');

		// mock for iframe
		nock('http://example.com/').get('/iframe').replyWithFile(200, mockDirname + '/iframe.html', {
			'Content-Type': 'text/html'
		});
		nock('http://example.com/').get('/cat.png').reply(200, 'OK');

		// mock for anchor
		nock('http://google.com').get('/').replyWithFile(200, mockDirname + '/google.html');
		nock('http://google.com').get('/google.png').reply(200, 'OK');

		await scrape(options);

		// should load css file and fonts from css file
		(await fs.stat(testDirname + '/css.css')).isFile().should.be.eql(true); // http://fonts.googleapis.com/css?family=Lato
		(await fs.stat(testDirname + '/UyBMtLsHKBKXelqf4x7VRQ.woff2')).isFile().should.be.eql(true);
		(await fs.stat(testDirname + '/1YwB1sO8YE1Lyjf12WNiUA.woff2')).isFile().should.be.eql(true);

		// should load html file and its sources from anchor
		(await fs.stat(testDirname + '/index_1.html')).isFile().should.be.eql(true);
		(await fs.stat(testDirname + '/google.png')).isFile().should.be.eql(true);

		// should load html file and its sources from iframe
		(await fs.stat(testDirname + '/iframe.html')).isFile().should.be.eql(true);
		(await fs.stat(testDirname + '/cat.png')).isFile().should.be.eql(true);
	});
});
