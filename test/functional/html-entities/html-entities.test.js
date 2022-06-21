import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import scrape from 'website-scraper';

const testDirname = './test/functional/html-entities/.tmp';
const mockDirname = './test/functional/html-entities/mocks';

describe('Functional: html entities', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	it('should decode all html-entities found in html files and not encode entities from css file', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/style.css').replyWithFile(200, mockDirname + '/style.css', {'content-type': 'text/css'});

		// in index.html
		// /fonts?family=Myriad&amp;v=2 => /fonts?family=Myriad&v=2
		nock('http://example.com/').get('/fonts?family=Myriad&v=2').reply(200, 'fonts.css', {'content-type': 'text/css'});
		// /?a=1&amp;style-attr.png => /?a=1&style-attr.png
		nock('http://example.com/').get('/style-attr.png?a=1&style-attr.png').reply(200, 'style-attr.png');
		// &quot;style-attr2.png&quot; => style-attr2.png
		nock('http://example.com/').get('/style-attr2.png').reply(200, 'style-attr2.png');
		// /?a=1&amp;b=2 => /?a=1&b=2
		nock('http://example.com/').get('/img.png?a=1&b=2').reply(200, 'img.png');
		// /test?b=2&amp;c=3&amp;d=4 => /test?b=2&c=3&d=4
		nock('http://example.com/').get('/?b=2&c=3&d=4').reply(200,
			'<html><head></head><body>index_1.html</body></html>',
			{'content-type': 'text/html'}
		);

		// in style.css
		// /?v=2&amp;name=external-style.png should stay not decoded
		nock('http://example.com/').get('/external-style.png?v=2&amp;name=external-style.png').reply(200, 'external-style.png');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			maxDepth: 2,
			recursive: true,
			subdirectories: [
				{ directory: 'local', extensions: ['.png', '.css'] }
			],
			ignoreErrors: false
		};

		await scrape(options);
		await `${testDirname}/index.html`.should.fileExists(true);
		const indexHtml = await fs.readFile(testDirname + '/index.html', { encoding: 'binary'});

		should(indexHtml).containEql('href="local/fonts.css');
		await `${testDirname}/local/fonts.css`.should.fileExists(true);
		should(await fs.readFile(testDirname + '/local/fonts.css', { encoding: 'binary'})).be.eql('fonts.css');

		// single quote (') replaced with &#x27; in attribute
		should(indexHtml).containEql('background: url(\'local/style-attr.png\')');
		await `${testDirname}/local/style-attr.png`.should.fileExists(true);
		should(await fs.readFile(testDirname + '/local/style-attr.png', { encoding: 'binary'})).be.eql('style-attr.png');

		// double quote (") replaced with &quot; in attribute
		should(indexHtml).containEql('background: url(&quot;local/style-attr2.png&quot;)');
		await `${testDirname}/local/style-attr2.png`.should.fileExists(true);
		should(await fs.readFile(testDirname + '/local/style-attr2.png', { encoding: 'binary'})).be.eql('style-attr2.png');

		should(indexHtml).containEql('img src="local/img.png');
		await `${testDirname}/local/img.png`.should.fileExists(true);
		should(await fs.readFile(testDirname + '/local/img.png', { encoding: 'binary'})).be.eql('img.png');

		should(indexHtml).containEql('href="index_1.html"');
		await `${testDirname}/index_1.html`.should.fileExists(true);
		should(await fs.readFile(testDirname + '/index_1.html', { encoding: 'binary'})).be.eql('<html><head></head><body>index_1.html</body></html>');

		await `${testDirname}/local/style.css`.should.fileExists(true);
		const styleCss = await fs.readFile(testDirname + '/local/style.css', { encoding: 'binary'});

		should(styleCss).containEql('url(\'external-style.png\')');
		await `${testDirname}/local/external-style.png`.should.fileExists(true);
		should(await fs.readFile(testDirname + '/local/external-style.png', { encoding: 'binary'})).be.eql('external-style.png');
	});

	it('should generate correct quotes which don\'t break html markup (see #355)', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/quotes.html');
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			ignoreErrors: false
		};

		await scrape(options);

		await `${testDirname}/index.html`.should.fileExists(true);
		const indexHtml = await fs.readFile(testDirname + '/index.html', { encoding: 'binary'});
		/*
			<div data-test='[{"breakpoint": 1200,"slidesToShow": 3}]'></div>
			becomes
			<div data-test="[{&quot;breakpoint&quot;: 1200,&quot;slidesToShow&quot;: 3}]"></div>
		 */
		should(indexHtml).containEql('data-test="[{&quot;breakpoint&quot;: 1200,&quot;slidesToShow&quot;: 3}]"');
	});
});
