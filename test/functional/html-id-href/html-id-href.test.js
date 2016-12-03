var should = require('should');
var nock = require('nock');
var fs = require('fs-extra');
var Scraper = require('../../../lib/scraper');

var testDirname = __dirname + '/.tmp';
var mockDirname = __dirname + '/mocks';

describe('Functional html id href', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should ignore same-file paths and update other-file paths', function() {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/sprite.svg').reply(200, 'sprite.svg');
		nock('https://mdn.mozillademos.org/').get('/files/6457/mdn_logo_only_color.png').reply(200, 'mdn_logo_only_color.png');
		nock('http://example.com/').get('/some/other.html').reply(200, 'other.html');

		var options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			recursive: true,
			maxDepth: 2,
			sources: [
				{ selector: 'svg *[xlink\\:href]', attr: 'xlink:href' },
				{ selector: 'svg *[href]', attr: 'href' },
				{ selector: 'a', attr: 'href' }
			],
			subdirectories: [
				{ directory: 'local', extensions: ['.png', '.svg'] }
			]
		};
		var scraper = new Scraper(options);

		return scraper.scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/other.html').should.be.eql(true);
			fs.existsSync(testDirname + '/local/sprite.svg').should.be.eql(true);
			fs.existsSync(testDirname + '/local/mdn_logo_only_color.png').should.be.eql(true);

			var indexHtml = fs.readFileSync(testDirname + '/index.html').toString();

			// should update path to external svgs
			should(indexHtml).containEql('xlink:href="local/sprite.svg#icon-undo"');
			should(indexHtml).containEql('href="local/sprite.svg#icon-redo"');
			// should keep links to local svgs
			should(indexHtml).containEql('xlink:href="#codrops" class="codrops-1"');
			should(indexHtml).containEql('xlink:href="#codrops" class="codrops-2"');
			should(indexHtml).containEql('xlink:href="#codrops" class="codrops-3"');

			should(indexHtml).containEql('<a href="#top">Go to top (this page)</a>');
			should(indexHtml).containEql('<a href="other.html#top">Go to top (other page)</a>');
		});
	});
});
