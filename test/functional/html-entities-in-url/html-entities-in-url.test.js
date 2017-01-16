var should = require('should');
var nock = require('nock');
var fs = require('fs-extra');
var Scraper = require('../../../lib/scraper');

var testDirname = __dirname + '/.tmp';
var mockDirname = __dirname + '/mocks';

describe('Functional: html entities in url', function() {

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
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/style.css').replyWithFile(200, mockDirname + '/style.css');

		// in index.html
		// /fonts?family=Myriad&amp;v=2 => /fonts?family=Myriad&v=2
		nock('http://example.com/').get('/fonts?family=Myriad&v=2').reply(200, 'fonts.css', {'content-type': 'text/css'});
		// /?a=1&amp;style-attr.png => /?a=1&style-attr.png
		nock('http://example.com/').get('/style-attr.png?a=1&style-attr.png').reply(200, 'style-attr.png', {'content-type': 'text/css'});
		// /?a=1&amp;b=2 => /?a=1&b=2
		nock('http://example.com/').get('/img.png?a=1&b=2').reply(200, 'img.png');
		// /test?b=2&amp;c=3&amp;d=4 => /test?b=2&c=3&d=4
		nock('http://example.com/').get('/?b=2&c=3&d=4').reply(200, 'index_1.html', {'content-type': 'text/html'});

		// in style.css
		// /?v=2&amp;name=external-style.png should stay not decoded
		nock('http://example.com/').get('/external-style.png?v=2&amp;name=external-style.png').reply(200, 'external-style.png');

		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			maxDepth: 2,
			recursive: true,
			subdirectories: [
				{ directory: 'local', extensions: ['.png', '.css'] }
			],
			ignoreErrors: false
		};
		var scraper = new Scraper(options);

		return scraper.scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			var indexHtml = fs.readFileSync(testDirname + '/index.html').toString();

			should(indexHtml).containEql('href="local/fonts.css');
			fs.existsSync(testDirname + '/local/fonts.css').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/fonts.css').toString()).be.eql('fonts.css');

			should(indexHtml).containEql('background: url(\'local/style-attr.png\')');
			fs.existsSync(testDirname + '/local/style-attr.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/style-attr.png').toString()).be.eql('style-attr.png');

			should(indexHtml).containEql('img src="local/img.png');
			fs.existsSync(testDirname + '/local/img.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/img.png').toString()).be.eql('img.png');

			should(indexHtml).containEql('href="index_1.html"');
			fs.existsSync(testDirname + '/index_1.html').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/index_1.html').toString()).be.eql('index_1.html');

			fs.existsSync(testDirname + '/local/style.css').should.be.eql(true);
			var styleCss = fs.readFileSync(testDirname + '/local/style.css').toString();

			should(styleCss).containEql('url(\'external-style.png\')');
			fs.existsSync(testDirname + '/local/external-style.png').should.be.eql(true);
			should(fs.readFileSync(testDirname + '/local/external-style.png').toString()).be.eql('external-style.png');
		});
	});
});
