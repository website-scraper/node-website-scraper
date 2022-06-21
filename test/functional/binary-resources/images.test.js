import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import scrape from 'website-scraper';

const testDirname = './test/functional/binary-resources/.tmp';
const mockDirname = './test/functional/binary-resources/mocks';

describe('Functional: images', () => {
	const options = {
		urls: [ 'http://example.com/' ],
		directory: testDirname,
		subdirectories: [
			{ directory: 'img', extensions: ['.jpg', '.png'] }
		],
		sources: [
			{ selector: 'img', attr: 'src' }
		],
		ignoreErrors: false
	};

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, });
	});

	beforeEach(() => {
		// mock base urls
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		
		// mock sources for index.html
		nock('http://example.com/').get('/test-image.png').replyWithFile(200, mockDirname + '/test-image.png', {'content-type': 'image/png'});
		nock('http://example.com/').get('/test-image.jpg').replyWithFile(200, mockDirname + '/test-image.jpg', {'content-type': 'image/jpeg'});
	});

	it('should load images and save content correctly', async () => {
		await scrape(options);

		// should create directory and subdirectories
		await `${testDirname}`.should.dirExists(true);
		await `${testDirname}/img`.should.dirExists(true);

		// should contain all sources found in index.html
		await `${testDirname}/img/test-image.png`.should.fileExists(true);
		await `${testDirname}/img/test-image.jpg`.should.fileExists(true);

		// all sources in index.html should be replaced with local paths
		await `${testDirname}/index.html`.should.fileExists(true);
		const indexHtml = await fs.readFile(`${testDirname}/index.html`, { encoding: 'binary'});
		let $ = cheerio.load(indexHtml);
		$('img.png').attr('src').should.be.eql('img/test-image.png');
		$('img.jpg').attr('src').should.be.eql('img/test-image.jpg');

		// content of downloaded images should equal original images
		const originalPng = await fs.readFile(mockDirname + '/test-image.png', { encoding: 'binary' });
		const originalJpg = await fs.readFile(mockDirname + '/test-image.jpg', { encoding: 'binary' });
		const resultPng = await fs.readFile(testDirname + '/img/test-image.png', { encoding: 'binary' });
		const resultJpg = await fs.readFile(testDirname + '/img/test-image.jpg', { encoding: 'binary' });

		should(resultPng).be.eql(originalPng);
		should(resultJpg).be.eql(originalJpg);
	});
});
