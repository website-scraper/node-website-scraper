import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
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

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
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
		fs.existsSync(testDirname).should.be.eql(true);
		fs.existsSync(testDirname + '/img').should.be.eql(true);

		// should contain all sources found in index.html
		fs.existsSync(testDirname + '/img/test-image.png').should.be.eql(true);
		fs.existsSync(testDirname + '/img/test-image.jpg').should.be.eql(true);

		// all sources in index.html should be replaced with local paths
		let $ = cheerio.load(fs.readFileSync(testDirname + '/index.html').toString());
		$('img.png').attr('src').should.be.eql('img/test-image.png');
		$('img.jpg').attr('src').should.be.eql('img/test-image.jpg');

		// content of downloaded images should equal original images
		const originalPng = fs.readFileSync(mockDirname + '/test-image.png');
		const originalJpg = fs.readFileSync(mockDirname + '/test-image.jpg');
		const resultPng = fs.readFileSync(testDirname + '/img/test-image.png');
		const resultJpg = fs.readFileSync(testDirname + '/img/test-image.jpg');

		should(resultPng).be.eql(originalPng);
		should(resultJpg).be.eql(originalJpg);
	});
});
