import * as chai from 'chai';
chai.should();
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/base/.tmp2';

describe('Functional: check it works', function() {

	beforeEach(function () {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should work with promise', () => {
		nock('http://example.com/').get('/').reply(200, '<html><head></head><body>TEST PROMISES</body></html>');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname
		};

		return scrape(options).then((result) => {
			result[0].url.should.be.eql('http://example.com/');
			result[0].filename.should.be.eql('index.html');
			result[0].text.should.be.eql('<html><head></head><body>TEST PROMISES</body></html>');
		});
	});
});
