import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import * as cheerio from 'cheerio';
import scrape from 'website-scraper';
import Resource from '../../../lib/resource.js';

const testDirname = './test/functional/base/.tmp';
const mockDirname = './test/functional/base/mocks';

describe('Functional: base', function() {
	const options = {
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
		],
		ignoreErrors: false
	};

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	beforeEach(() => {
		// mock base urls
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/about').replyWithFile(200, mockDirname + '/about.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/blog').reply(303, '', { 'Location': 'http://blog.example.com/' });
		nock('http://blog.example.com/').get('/').replyWithFile(200, mockDirname + '/blog.html', {'content-type': 'text/html'});

		// mock sources for index.html
		nock('http://example.com/').get('/index.css').replyWithFile(200, mockDirname + '/index.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/background.png').reply(200, 'OK');
		nock('http://example.com/').get('/cat.jpg').reply(200, 'OK');
		nock('http://example.com/').get('/script.min.js').reply(200, 'OK');

		// mock sources for index.css
		nock('http://example.com/').get('/files/index-import-1.css').reply(200, 'OK', {'content-type': 'text/css'});
		nock('http://example.com/').get('/files/index-import-2.css').replyWithFile(200, mockDirname + '/index-import-2.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/files/index-import-3.css').reply(200, 'OK', {'content-type': 'text/css'});
		nock('http://example.com/').get('/files/index-image-1.png').reply(200, 'OK');
		nock('http://example.com/').get('/files/index-image-2.png').reply(200, 'OK');

		// mocks for blog.html
		nock('http://blog.example.com/').get('/files/fail-1.png').replyWithError('something awful happened');
	});

	it('should load multiple urls to single directory with all specified sources', () => {
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
			let $ = cheerio.load(fs.readFileSync(testDirname + '/index.html').toString());
			$('link[rel="stylesheet"]').attr('href').should.be.eql('css/index.css');
			$('style').html().should.containEql('img/background.png');
			$('img').attr('src').should.be.eql('img/cat.jpg');
			$('script').attr('src').should.be.eql('js/script.min.js');

			// should contain all sources found in index.css recursively
			fs.existsSync(testDirname + '/css/index-import-1.css').should.be.eql(true);
			fs.existsSync(testDirname + '/css/index-import-2.css').should.be.eql(true);
			fs.existsSync(testDirname + '/css/index-import-3.css').should.be.eql(true);
			fs.existsSync(testDirname + '/img/index-image-1.png').should.be.eql(true);
			fs.existsSync(testDirname + '/img/index-image-2.png').should.be.eql(true);

			// all sources in index.css should be replaces with local files recursively
			const indexCss = fs.readFileSync(testDirname + '/css/index.css').toString();
			indexCss.should.not.containEql('files/index-import-1.css');
			indexCss.should.not.containEql('files/index-import-2.css');
			indexCss.should.not.containEql('http://example.com/files/index-image-1.png');
			indexCss.should.containEql('index-import-1.css');
			indexCss.should.containEql('index-import-2.css');
			indexCss.should.containEql('../img/index-image-1.png');

			const indexImportCss = fs.readFileSync(testDirname + '/css/index-import-2.css').toString();
			indexImportCss.should.not.containEql('http://example.com/files/index-image-2.png');
			indexImportCss.should.containEql('../img/index-image-2.png');

			// should deal with base tag in about.html and not load new resources
			// all sources in about.html should be replaced with already loaded local resources
			$ = cheerio.load(fs.readFileSync(testDirname + '/about.html').toString());
			$('link[rel="stylesheet"]').attr('href').should.be.eql('css/index.css');
			$('style').html().should.containEql('img/background.png');
			$('img').attr('src').should.be.eql('img/cat.jpg');
			$('script').attr('src').should.be.eql('js/script.min.js');

			// should not replace not loaded files
			$ = cheerio.load(fs.readFileSync(testDirname + '/blog.html').toString());
			$('img').attr('src').should.be.eql('files/fail-1.png');
		});
	});

	it('should load multiple urls to single directory with all specified sources with bySiteStructureFilenameGenerator', () => {
		return scrape({...options, filenameGenerator: 'bySiteStructure'}).then(function(result) {
			result.should.be.instanceOf(Array).and.have.length(3);

			should(result[0].url).eql('http://example.com/');
			should(result[0].filename).equalFileSystemPath('example.com/index.html');
			result[0].should.have.properties('children');
			result[0].children.should.be.instanceOf(Array).and.have.length(4);
			result[0].children[0].should.be.instanceOf(Resource);

			should(result[1].url).eql('http://example.com/about');
			should(result[1].filename).equalFileSystemPath('example.com/about/index.html');
			result[1].should.have.properties('children');
			result[1].children.should.be.instanceOf(Array).and.have.length(4);
			result[1].children[0].should.be.instanceOf(Resource);

			should(result[2].url).eql('http://blog.example.com/');  // url after redirect
			should(result[2].filename).equalFileSystemPath('blog.example.com/index.html');
			result[2].should.have.properties('children');
			result[2].children.should.be.instanceOf(Array).and.have.length(1);
			result[2].children[0].should.be.instanceOf(Resource);

			// should create directory and subdirectories
			fs.existsSync(testDirname).should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/about').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/files').should.be.eql(true);
			fs.existsSync(testDirname + '/blog.example.com').should.be.eql(true);

			// should contain all sources found in index.html
			fs.existsSync(testDirname + '/example.com/index.css').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/background.png').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/cat.jpg').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/script.min.js').should.be.eql(true);

			// all sources in index.html should be replaced with local paths
			let $ = cheerio.load(fs.readFileSync(testDirname + '/example.com/index.html').toString());
			$('link[rel="stylesheet"]').attr('href').should.be.eql('index.css');
			$('style').html().should.containEql('background.png');
			$('img').attr('src').should.be.eql('cat.jpg');
			$('script').attr('src').should.be.eql('script.min.js');

			// should contain all sources found in index.css recursively
			fs.existsSync(testDirname + '/example.com/files/index-import-1.css').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/files/index-import-2.css').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/files/index-import-3.css').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/files/index-image-1.png').should.be.eql(true);
			fs.existsSync(testDirname + '/example.com/files/index-image-2.png').should.be.eql(true);

			// all sources in index.css should be replaces with local files recursively
			const indexCss = fs.readFileSync(testDirname + '/example.com/index.css').toString();
			indexCss.should.containEql('files/index-import-1.css');
			indexCss.should.containEql('files/index-import-2.css');
			indexCss.should.containEql('files/index-image-1.png');

			const indexImportCss = fs.readFileSync(testDirname + '/example.com/files/index-import-2.css').toString();
			indexImportCss.should.containEql('index-image-2.png');

			// should deal with base tag in about.html and not load new resources
			// all sources in about.html should be replaced with already loaded local resources
			$ = cheerio.load(fs.readFileSync(testDirname + '/example.com/about/index.html').toString());
			$('link[rel="stylesheet"]').attr('href').should.be.eql('../index.css');
			$('style').html().should.containEql('../background.png');
			$('img').attr('src').should.be.eql('../cat.jpg');
			$('script').attr('src').should.be.eql('../script.min.js');

			// should not replace not loaded files
			$ = cheerio.load(fs.readFileSync(testDirname + '/blog.example.com/index.html').toString());
			$('img').attr('src').should.be.eql('files/fail-1.png');
		});
	});
});
