import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/max-depth/.tmp';
const mockDirname = './test/functional/max-depth/mocks';

describe('Functional: maxDepth and maxRecursiveDepth ', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should filter out all resources by depth > maxDepth', async () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'script', attr: 'src' },
				{ selector: 'a', attr: 'href' }
			],
			maxDepth: 2
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		nock('http://example.com/').get('/depth1.html').replyWithFile(200, mockDirname + '/depth1.html');
		nock('http://example.com/').get('/img-depth1.jpg').reply(200, 'img-depth1.jpg');
		nock('http://example.com/').get('/script-depth1.js').reply(200, 'script-depth1.js');

		nock('http://example.com/').get('/depth2.html').replyWithFile(200, mockDirname + '/depth2.html');
		nock('http://example.com/').get('/img-depth2.jpg').reply(200, 'img-depth2.jpg');
		nock('http://example.com/').get('/script-depth2.js').reply(200, 'script-depth2.js');

		nock('http://example.com/').get('/depth3.html').reply(200, 'OK');
		nock('http://example.com/').get('/img-depth3.jpg').reply(200, 'img-depth3.jpg');
		nock('http://example.com/').get('/script-depth3.js').reply(200, 'script-depth3.js');

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);

		await `${testDirname}/depth1.html`.should.fileExists(true);
		await `${testDirname}/img-depth1.jpg`.should.fileExists(true);
		await `${testDirname}/script-depth1.js`.should.fileExists(true);

		await `${testDirname}/depth2.html`.should.fileExists(false);
		await `${testDirname}/img-depth2.jpg`.should.fileExists(false);
		await `${testDirname}/script-depth2.js`.should.fileExists(false);

		await `${testDirname}/depth3.html`.should.fileExists(false);
		await `${testDirname}/img-depth3.jpg`.should.fileExists(false);
		await `${testDirname}/script-depth3.js`.should.fileExists(false);
	});


	it('should filter out only anchors by depth > maxRecursiveDepth', async () => {
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'script', attr: 'src' },
				{ selector: 'a', attr: 'href' }
			],
			maxRecursiveDepth: 2
		};

		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');

		nock('http://example.com/').get('/depth1.html').replyWithFile(200, mockDirname + '/depth1.html');
		nock('http://example.com/').get('/img-depth1.jpg').reply(200, 'img-depth1.jpg');
		nock('http://example.com/').get('/script-depth1.js').reply(200, 'script-depth1.js');

		nock('http://example.com/').get('/depth2.html').replyWithFile(200, mockDirname + '/depth2.html');
		nock('http://example.com/').get('/img-depth2.jpg').reply(200, 'img-depth2.jpg');
		nock('http://example.com/').get('/script-depth2.js').reply(200, 'script-depth2.js');

		nock('http://example.com/').get('/depth3.html').reply(200, 'OK');
		nock('http://example.com/').get('/img-depth3.jpg').reply(200, 'img-depth3.jpg');
		nock('http://example.com/').get('/script-depth3.js').reply(200, 'script-depth3.js');

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);

		await `${testDirname}/depth1.html`.should.fileExists(true);
		await `${testDirname}/img-depth1.jpg`.should.fileExists(true);
		await `${testDirname}/script-depth1.js`.should.fileExists(true);

		await `${testDirname}/depth2.html`.should.fileExists(true);
		await `${testDirname}/img-depth2.jpg`.should.fileExists(true);
		await `${testDirname}/script-depth2.js`.should.fileExists(true);

		await `${testDirname}/depth3.html`.should.fileExists(true);
		// img-depth3.jpg and script-depth3.js - dependencies of depth2.html
		// they should be loaded because maxRecursiveDepth applies only to <a href=''>
		await `${testDirname}/img-depth3.jpg`.should.fileExists(true);
		await `${testDirname}/script-depth3.js`.should.fileExists(true);
	});

	it('should correctly save same resource with different depth and maxRecursiveDepth', async () => {
		/*
		pageA -> pageB
		pageA -> pageC
		pageB -> pageC
		* */
		const options = {
			urls: [ {url: 'http://example.com/pageA.html', filename: 'pageA.html'} ],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{ selector: 'a', attr: 'href' }
			],
			maxRecursiveDepth: 1
		};

		const pageA = `<html>
			<body>
				<a href="/pageB.html"></a>
				<a href="/pageC.html"></a>
			</body>
		</html>`;

		const pageB = `<html>
			<body>
				<a href="/pageC.html"></a>
			</body>
		</html>`;

		nock('http://example.com/').get('/pageA.html').reply(200, pageA, {'Content-Type': 'text/html'});
		nock('http://example.com/').get('/pageB.html').reply(200, pageB, {'Content-Type': 'text/html'});
		nock('http://example.com/').get('/pageC.html').reply(200, 'pageC', {'Content-Type': 'text/html'});

		await scrape(options);

		await `${testDirname}/pageA.html`.should.fileExists(true);
		await `${testDirname}/pageB.html`.should.fileExists(true);
		await `${testDirname}/pageC.html`.should.fileExists(true);

		const pageASaved = await fs.readFile(testDirname + '/pageA.html', { encoding: 'binary' });
		pageASaved.should.containEql('<a href="pageB.html"');
		pageASaved.should.containEql('<a href="pageC.html"');

		const pageBSaved = await fs.readFile(testDirname + '/pageB.html', { encoding: 'binary' });
		// todo: should we change reference here because pageC was already downloaded?
		pageBSaved.should.containEql('<a href="/pageC.html"'); // reference to pageC was not changed here because it > maxRecursiveDepth
	});

});
