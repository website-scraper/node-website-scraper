import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/req-res-customizations-request/.tmp';
const mockDirname = './test/functional/req-res-customizations-request/mocks';

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

	it('should use options from request property if no beforeRequest actions', function() {
		nock('http://example.com/').get('/').query({myParam: 122}).reply(200, 'response for url with query');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			request: {
				searchParams: {myParam: 122}
			}
		};

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			const indexHtml = fs.readFileSync(testDirname + '/index.html').toString();
			should(indexHtml).containEql('response for url with query');
		});
	});

	it('should use options returned by beforeRequest action', function() {
		nock('http://example.com/').get('/').query({myParam: 122}).reply(200, 'response for url with query');

		class CustomRequestOptions {
			apply(add) {
				add('beforeRequest', ()=> {
					return {
						requestOptions:{
							searchParams: {myParam: 122}
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
