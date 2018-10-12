const should = require('should');
const nock = require('nock');
const fs = require('fs-extra');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';
const mockDirname = __dirname + '/mocks';

describe('Functional: customize request options with plugin', function() {

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

		class CustomRequestOptions {
			apply(add) {
				add('beforeRequest', ()=> {
					return {
						requestOptions:{
							qs: {myParam: 122}
						}
					};
				});
			}
		}

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			plugins: [
				new CustomRequestOptions()
			]
		};

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			const indexHtml = fs.readFileSync(testDirname + '/index.html').toString();
			should(indexHtml).containEql('response for url with query');
		});
	});
});
