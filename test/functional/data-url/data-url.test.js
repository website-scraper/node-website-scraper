import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const expectedDirname = './test/functional/data-url/expected';
const testDirname = './test/functional/data-url/.tmp';
const mockDirname = './test/functional/data-url/mocks';

describe('Functional: data urls handling', function () {

	beforeEach(function () {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should correctly handle html files with data urls in attributes', function () {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/product/abc/media/521811121-392x351.jpg').reply(200, '/product/abc/media/521811121-392x351.jpg');
		const options = {
			urls: ['http://example.com/'],
			directory: testDirname,
			urlFilter (url) {
				return url.indexOf('data:image') === -1;
			}
		};

		return scrape(options).then(function () {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/images/521811121-392x351.jpg').should.be.eql(true);

			const actualIndexHtml = fs.readFileSync(testDirname + '/index.html').toString();
			const expectedIndexHtml = fs.readFileSync(expectedDirname + '/index.html').toString();

			should(actualIndexHtml).equal(expectedIndexHtml);
		});
	});
});
