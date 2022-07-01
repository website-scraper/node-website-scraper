import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/req-res-customizations-request/.tmp';
const mockDirname = './test/functional/req-res-customizations-request/mocks';

describe('Functional: customize request options with plugin', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should use options from request property if no beforeRequest actions', async () => {
		nock('http://example.com/').get('/').query({myParam: 122}).reply(200, 'response for url with query');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			request: {
				searchParams: {myParam: 122}
			}
		};

		await scrape(options);

		(await fs.stat(testDirname + '/index.html')).isFile().should.be.eql(true);
		const indexHtml = await fs.readFile(testDirname + '/index.html', { encoding: 'binary'});
		should(indexHtml).containEql('response for url with query');
	});

	it('should use options returned by beforeRequest action', async () => {
		nock('http://example.com/').get('/').query({myParam: 122}).reply(200, 'response for url with query');

		class CustomRequestOptions {
			apply (add) {
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

		await scrape(options);

		(await fs.stat(testDirname + '/index.html')).isFile().should.be.eql(true);
		const indexHtml = await fs.readFile(testDirname + '/index.html', { encoding: 'binary' });
		indexHtml.should.containEql('response for url with query');
	});
});
