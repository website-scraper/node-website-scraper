import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/request-concurrency/.tmp';
const mockDirname = './test/functional/request-concurrency/mocks';

describe('Functional concurrent requests', function() {
	let maxConcurrentRequests, currentConcurrentRequests;

	beforeEach(function () {
		nock.cleanAll();
		nock.disableNetConnect();

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html')
		nock('http://example.com/').get('/page1.html').delay(200).reply(200, 'ok');
		nock('http://example.com/').get('/page2.html').delay(200).reply(200, 'ok');
		nock('http://example.com/').get('/page3.html').delay(200).reply(200, 'ok');
		nock('http://example.com/').get('/page4.html').delay(200).reply(200, 'ok');
		nock('http://example.com/').get('/page5.html').delay(200).reply(200, 'ok');
		nock('http://example.com/').get('/page6.html').delay(200).reply(200, 'ok');

		class MyPlugin {
			apply (registerAction) {
				registerAction('beforeRequest', ({requestOptions}) => {
					currentConcurrentRequests++;
					if (maxConcurrentRequests < currentConcurrentRequests) {
						maxConcurrentRequests = currentConcurrentRequests;
					}
					return {requestOptions};
				});
				registerAction('afterResponse', ({response}) => {
					currentConcurrentRequests--;
					return response.body;
				});
			}
		}

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			recursive: true,
			sources: [],
			requestConcurrency: 1,
			plugins: [new MyPlugin()]
		};

		maxConcurrentRequests = 0;
		currentConcurrentRequests = 0;

		return scrape(options);
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should have maximum concurrent requests == requestConcurrency option', () => {
		maxConcurrentRequests.should.be.belowOrEqual(1);
	});
});
