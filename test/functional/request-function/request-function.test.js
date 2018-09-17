var should = require('should');
var nock = require('nock');
var fs = require('fs-extra');
var scrape = require('../../../index');

var testDirname = __dirname + '/.tmp';
var mockDirname = __dirname + '/mocks';

describe('Functional: pass function to "request" option', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should use function which returns request option for resource ', function() {
		nock('http://example.com/').get('/').query({myParam: 122}).reply(200, 'response for url with query');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			request: () => {
					return {
						qs: {myParam: 122}
					}
			}
		};

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			const indexHtml = fs.readFileSync(testDirname + '/index.html').toString();
			should(indexHtml).containEql('response for url with query');
		});
	});
});
