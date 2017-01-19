require('should');
var nock = require('nock');
var fs = require('fs-extra');
var cheerio = require('cheerio');
var scrape = require('../../../index');
var Resource = require('../../../lib/resource');

var testDirname = __dirname + '/.tmp';
var mockDirname = __dirname + '/mocks';

describe('Functional base', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should load multiple urls to single directory with all specified sources', function () {
		var options = {
			urls: [
				'http://example.com/',   // Will be saved with default filename 'index.html'
				{ url: 'http://example.com/about', filename: 'about.html' },
				{ url: 'http://example.com/blog', filename: 'blog.html' }
			],
			directory: testDirname,
			defaultFilename: 'index.html',
			subdirectories: [
				{ directory: 'img', extensions: ['.jpg', '.png'] },
				{ directory: 'js', extensions: ['.js'] },
				{ directory: 'css', extensions: ['.css'] }
			],
			sources: [
				{ selector: 'img', attr: 'src' },
				{ selector: 'link[rel="stylesheet"]', attr: 'href' },
				{ selector: 'script', attr: 'src' },
				{ selector: 'style' }
			]
		};

		// mock base urls
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html');
		nock('http://example.com/').get('/about').replyWithFile(200, mockDirname + '/about.html');
		nock('http://example.com/').get('/blog').reply(303, '', { 'Location': 'http://blog.example.com/' });
		nock('http://blog.example.com/').get('/').replyWithFile(200, mockDirname + '/blog.html');

		// mock sources for index.html
		nock('http://example.com/').get('/index.css').replyWithFile(200, mockDirname + '/index.css');
		nock('http://example.com/').get('/background.png').reply(200, 'OK');
		nock('http://example.com/').get('/cat.jpg').reply(200, 'OK');
		nock('http://example.com/').get('/script.min.js').reply(200, 'OK');

		// mock sources for index.css
		nock('http://example.com/').get('/files/index-import-1.css').reply(200, 'OK');
		nock('http://example.com/').get('/files/index-import-2.css').replyWithFile(200, mockDirname + '/index-import-2.css');
		nock('http://example.com/').get('/files/index-import-3.css').reply(200, 'OK');
		nock('http://example.com/').get('/files/index-image-1.png').reply(200, 'OK');
		nock('http://example.com/').get('/files/index-image-2.png').reply(200, 'OK');

		// mocks for blog.html
		nock('http://blog.example.com/').get('/files/fail-1.png').replyWithError('something awful happened');

		return scrape(options).then(function(result) {
			// should return right result
			result.should.be.instanceOf(Array).and.have.length(3);

			result[0].should.have.properties({ url: 'http://example.com/', filename: 'index.html' });
			result[0].should.have.properties('children');
			result[0].children.should.be.instanceOf(Array).and.have.length(4);
			result[0].children[0].should.be.instanceOf(Resource);

			result[1].should.have.properties({ url: 'http://example.com/about', filename: 'about.html' });
			result[1].should.have.properties('children');
			result[1].children.should.be.instanceOf(Array).and.have.length(4);
			result[1].children[0].should.be.instanceOf(Resource);

			result[2].should.have.properties({ url: 'http://blog.example.com/', filename: 'blog.html' }); // url after redirect
			result[2].should.have.properties('children');
			result[2].children.should.be.instanceOf(Array).and.have.length(1);
			result[2].children[0].should.be.instanceOf(Resource);

			// should create directory and subdirectories
			fs.existsSync(testDirname).should.be.eql(true);
			fs.existsSync(testDirname + '/img').should.be.eql(true);
			fs.existsSync(testDirname + '/js').should.be.eql(true);
			fs.existsSync(testDirname + '/css').should.be.eql(true);

			// should contain all sources found in index.html
			fs.existsSync(testDirname + '/css/index.css').should.be.eql(true);
			fs.existsSync(testDirname + '/img/background.png').should.be.eql(true);
			fs.existsSync(testDirname + '/img/cat.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/js/script.min.js').should.be.eql(true);

			// all sources in index.html should be replaced with local paths
			var $ = cheerio.load(fs.readFileSync(testDirname + '/index.html').toString());
			$('link[rel="stylesheet"]').attr('href').should.be.eql('css/index.css');
			$('style').text().should.containEql('img/background.png');
			$('img').attr('src').should.be.eql('img/cat.jpg');
			$('script').attr('src').should.be.eql('js/script.min.js');

			// should contain all sources found in index.css recursively
			fs.existsSync(testDirname + '/css/index-import-1.css').should.be.eql(true);
			fs.existsSync(testDirname + '/css/index-import-2.css').should.be.eql(true);
			fs.existsSync(testDirname + '/css/index-import-3.css').should.be.eql(true);
			fs.existsSync(testDirname + '/img/index-image-1.png').should.be.eql(true);
			fs.existsSync(testDirname + '/img/index-image-2.png').should.be.eql(true);

			// all sources in index.css should be replaces with local files recursively
			var indexCss = fs.readFileSync(testDirname + '/css/index.css').toString();
			indexCss.should.not.containEql('files/index-import-1.css');
			indexCss.should.not.containEql('files/index-import-2.css');
			indexCss.should.not.containEql('http://example.com/files/index-image-1.png');
			indexCss.should.containEql('index-import-1.css');
			indexCss.should.containEql('index-import-2.css');
			indexCss.should.containEql('../img/index-image-1.png');

			var indexImportCss = fs.readFileSync(testDirname + '/css/index-import-2.css').toString();
			indexImportCss.should.not.containEql('http://example.com/files/index-image-2.png');
			indexImportCss.should.containEql('../img/index-image-2.png');

			// should deal with base tag in about.html and not load new resources
			// all sources in about.html should be replaced with already loaded local resources
			$ = cheerio.load(fs.readFileSync(testDirname + '/about.html').toString());
			$('link[rel="stylesheet"]').attr('href').should.be.eql('css/index.css');
			$('style').text().should.containEql('img/background.png');
			$('img').attr('src').should.be.eql('img/cat.jpg');
			$('script').attr('src').should.be.eql('js/script.min.js');

			// should not replace not loaded files
			$ = cheerio.load(fs.readFileSync(testDirname + '/blog.html').toString());
			$('img').attr('src').should.be.eql('files/fail-1.png');
		});
	});
});
