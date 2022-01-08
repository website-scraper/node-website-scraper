import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/html-entities/.tmp';
const mockDirname = './test/functional/html-entities/mocks';

describe('Functional: html entities', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should decode all html-entities found in html files and not encode entities from css file', function() {
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

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			const indexHtml = fs.readFileSync(testDirname + '/index.html').toString();

			should(indexHtml).containEql('href="local/fonts.css');
			fs.existsSync(testDirname + '/local/fonts.css').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/fonts.css').toString()).be.eql('fonts.css');

			// single quote (') replaced with &#x27; in attribute
			should(indexHtml).containEql('background: url(\'local/style-attr.png\')');
			fs.existsSync(testDirname + '/local/style-attr.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/style-attr.png').toString()).be.eql('style-attr.png');

			// double quote (") replaced with &quot; in attribute
			should(indexHtml).containEql('background: url(&quot;local/style-attr2.png&quot;)');
			fs.existsSync(testDirname + '/local/style-attr2.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/style-attr2.png').toString()).be.eql('style-attr2.png');

			should(indexHtml).containEql('img src="local/img.png');
			fs.existsSync(testDirname + '/local/img.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/img.png').toString()).be.eql('img.png');

			should(indexHtml).containEql('href="index_1.html"');
			fs.existsSync(testDirname + '/index_1.html').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/index_1.html').toString()).be.eql('<html><head></head><body>index_1.html</body></html>');

			fs.existsSync(testDirname + '/local/style.css').should.be.eql(true);
			const styleCss = fs.readFileSync(testDirname + '/local/style.css').toString();

			should(styleCss).containEql('url(\'external-style.png\')');
			fs.existsSync(testDirname + '/local/external-style.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/external-style.png').toString()).be.eql('external-style.png');
		});
	});

	it('should generate correct quotes which don\'t break html markup (see #355)', async () => {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/quotes.html');
		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			ignoreErrors: false
		};

		await scrape(options);

		fs.existsSync(testDirname + '/index.html').should.be.eql(true);
		const indexHtml = fs.readFileSync(testDirname + '/index.html').toString();
		/*
			<div data-test='[{"breakpoint": 1200,"slidesToShow": 3}]'></div>
			becomes
			<div data-test="[{&quot;breakpoint&quot;: 1200,&quot;slidesToShow&quot;: 3}]"></div>
		 */
		should(indexHtml).containEql('data-test="[{&quot;breakpoint&quot;: 1200,&quot;slidesToShow&quot;: 3}]"');
	});
});
