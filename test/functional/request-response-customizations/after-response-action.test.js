import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/req-res-customizations-after-response/.tmp';
const mockDirname = './test/functional/req-res-customizations-after-response/mocks';

describe('Functional: afterResponse action in plugin', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should skip downloading resource if afterResponse returns null', function() {
		nock('http://example.com/').get('/1.html').reply(200, 'content of 1.html');
		nock('http://example.com/').get('/2.html').reply(404);

		class Skip404ResponseHandler {
			apply(add) {
				add('afterResponse', ({response}) => {
					if (response.statusCode === 404) {
						return null;
					} else {
						return {
							body: response.body,
							metadata: {
								headers: response.headers,
								someOtherData: [ 1, 2, 3 ]
							}
						}
					}
				});
			}
		}

		const options = {
			urls: [
				{ url: 'http://example.com/1.html', filename: '1.html' },
				{ url: 'http://example.com/2.html', filename: '2.html' }
			],
			directory: testDirname,
			plugins: [
				new Skip404ResponseHandler()
			]
		};

		return scrape(options).then(function(result) {
			should(result[0]).have.properties({ url: 'http://example.com/1.html', filename: '1.html', saved: true });
			should(result[1]).have.properties({ url: 'http://example.com/2.html', filename: '2.html', saved: false });

			fs.existsSync(testDirname + '/1.html').should.be.eql(true);
			const indexHtml = fs.readFileSync(testDirname + '/1.html').toString();
			should(indexHtml).containEql('content of 1.html');

			fs.existsSync(testDirname + '/2.html').should.be.eql(false);
		});
	});
});
