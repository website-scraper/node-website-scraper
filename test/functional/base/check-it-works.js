const should = require('should');
const nock = require('nock');
const fs = require('fs-extra');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';

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

	it('should work with callback', (done) => {
		nock('http://example.com/').get('/').reply(200, 'TEST CALLBACK');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname
		};

		scrape(options, function(err, result) {
			should(err).be.eql(null);
			should(result[0].url).be.eql('http://example.com/');
			should(result[0].filename).be.eql('index.html');
			should(result[0].text).be.eql('TEST CALLBACK');
			done();
		});
	});

	it('should work with promise', () => {
		nock('http://example.com/').get('/').reply(200, 'TEST PROMISES');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname
		};

		return scrape(options).then((result) => {
			should(result[0].url).be.eql('http://example.com/');
			should(result[0].filename).be.eql('index.html');
			should(result[0].text).be.eql('TEST PROMISES');
		});
	});
});
