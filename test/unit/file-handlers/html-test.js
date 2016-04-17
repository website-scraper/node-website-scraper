require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var Promise = require('bluebird');
var Scraper = require('../../../lib/scraper');
var Resource = require('../../../lib/resource');
var loadHtml = require('../../../lib/file-handlers/html');

var testDirname = __dirname + '/.html-test';
var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: testDirname,
	sources: [
		{ selector: 'img', attr: 'src' },
		{ selector: 'img', attr: 'srcset' },
		{ selector: 'link[rel="stylesheet"]', attr: 'href' },
		{ selector: 'script', attr: 'src'},
		{ selector: 'a', attr: 'href' }
	]
};
var scraper;

describe('Html handler', function () {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
		scraper = new Scraper(defaultScraperOpts);
		scraper.prepare();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	describe('#loadHtml(context, resource)', function() {

		it('should remove base tag from text and update url for absolute href', function(done) {
			var html = ' \
				<html lang="en"> \
				<head> \
				<base href="http://some-other-domain.com/src">\
				</head> \
				<body></body> \
				</html>\
			';
			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				po.getUrl().should.be.eql('http://some-other-domain.com/src');
				done();
			}).catch(done);
		});

		it('should remove base tag from text and update url for relative href', function(done) {
			var html = ' \
				<html lang="en"> \
				<head> \
				<base href="/src">\
				</head> \
				<body></body> \
				</html>\
			';
			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				po.getUrl().should.be.eql('http://example.com/src');
				done();
			}).catch(done);
		});

		it('should not remove base tag if it doesn\'t have href attribute', function(done) {
			var html = ' \
				<html lang="en"> \
				<head> \
				<base target="_blank">\
				</head> \
				<body></body> \
				</html>\
			';
			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				po.getUrl().should.be.eql('http://example.com');
				po.getText().should.containEql('<base target="_blank">');
				done();
			}).catch(done);
		});

		it('should not call loadResource if no sources in html', function(done) {
			var loadResourceSpy = sinon.spy(scraper, 'loadResource');

			var po = new Resource('http://example.com', 'index.html');
			po.setText('');

			loadHtml(scraper, po).then(function() {
				loadResourceSpy.called.should.be.eql(false);
				done();
			}).catch(done);
		});

		it('should not call loadResource if source attr is empty', function(done) {
			nock('http://example.com').get('/test.png').reply(200, 'OK');

			var loadResourceSpy = sinon.spy(scraper, 'loadResource');

			var html = ' \
				<html lang="en"> \
				<head></head> \
				<body><img src=""></body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				loadResourceSpy.called.should.be.eql(false);
				done();
			}).catch(done);
		});

		it('should call loadResource once with correct params', function(done) {
			nock('http://example.com').get('/test.png').reply(200, 'OK');

			var loadResourceSpy = sinon.spy(scraper, 'loadResource');

			var html = ' \
				<html lang="en"> \
				<head></head> \
				<body><img src="test.png"></body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				loadResourceSpy.calledOnce.should.be.eql(true);
				loadResourceSpy.args[0][0].url.should.be.eql('http://example.com/test.png');
				done();
			}).catch(done);
		});

		it('should call loadResource for each found source with correct params', function(done) {
			nock('http://example.com').get('/a.jpg').reply(200, 'OK');
			nock('http://example.com').get('/b.css').reply(200, 'OK');
			nock('http://example.com').get('/c.js').reply(200, 'OK');

			var loadResourceSpy = sinon.spy(scraper, 'loadResource');
			var html = '\
				<html> \
				<head> \
					<link rel="stylesheet" href="/b.css"> \
					<script src="c.js"></script>\
				</head> \
				<body> \
					<img src="a.jpg"> \
				</body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			// order of loading is determined by order of sources in scraper options
			loadHtml(scraper, po).then(function() {
				loadResourceSpy.calledThrice.should.be.eql(true);
				loadResourceSpy.args[0][0].url.should.be.eql('http://example.com/a.jpg');
				loadResourceSpy.args[1][0].url.should.be.eql('http://example.com/b.css');
				loadResourceSpy.args[2][0].url.should.be.eql('http://example.com/c.js');
				done();
			}).catch(done);
		});

		it('should replace all sources in text with local files', function(done) {
			nock('http://example.com').get('/public/img/a.jpg').reply(200, 'OK');
			nock('http://example.com').get('/b.css').reply(200, 'OK');
			nock('http://example.com').get('/scripts/c.js').once().reply(200, 'OK');

			var loadStub = sinon.stub(scraper, 'loadResource');
			loadStub.onFirstCall().returns(Promise.resolve(new Resource('http://example.com/public/img/a.jpg', 'local/a.jpg')));
			loadStub.onSecondCall().returns(Promise.resolve(new Resource('http://example.com/b.css', 'local/b.css')));
			loadStub.onThirdCall().returns(Promise.resolve(new Resource('http://example.com/img/c.jpg', 'local/c.js')));

			var html = '\
				<html> \
				<head> \
					<link rel="stylesheet" href="http://example.com/a.css"> \
					<script src="scripts/c.js"></script>\
				</head> \
				<body> \
					<img src="http://example.com/public/img/a.jpg"> \
				</body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function(){
				var text = po.getText();
				text.should.not.containEql('http://example.com/public/img/a.jpg');
				text.should.not.containEql('http://example.com/b.css');
				text.should.not.containEql('scripts/c.js');
				text.should.containEql('local/a.jpg');
				text.should.containEql('local/b.css');
				text.should.containEql('local/c.js');
				done();
			}).catch(done);
		});

		it('should keep hash in url for html resources', function (done) {
			nock('http://example.com').get('/page1.html').reply(200, 'OK');

			var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
			sinon.stub(resourceStub, 'getType').returns('html');
			sinon.stub(scraper, 'loadResource').returns(Promise.resolve(resourceStub));

			var html = '\
				<html> \
				<body> \
					<a href="http://example.com/page1.html#hash">link</a> \
				</body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function(){
				var text = po.getText();
				text.should.containEql('local/page1.html#hash');
				done();
			}).catch(done);
		});

		it('should remove hash from url for not-html resources', function (done) {
			nock('http://example.com').get('/page1.html').reply(200, 'OK');

			var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
			sinon.stub(resourceStub, 'getType').returns('other');
			sinon.stub(scraper, 'loadResource').returns(Promise.resolve(resourceStub));

			var html = '\
				<html> \
				<body> \
					<a href="http://example.com/page1.html#hash">link</a> \
				</body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function(){
				var text = po.getText();
				text.should.not.containEql('local/page1.html#hash');
				text.should.containEql('local/page1.html');
				done();
			}).catch(done);
		});

		it('should not encode text to html entities', function (done) {
			var html = '\
				<html> \
				<body> \
					<p>Этот текст не должен быть преобразован в html entities</p>\
				</body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function () {
				var text = po.getText();
				text.should.containEql('Этот текст не должен быть преобразован в html entities');
				done();
			}).catch(done);
		});

		it('should handle img tag with srcset attribute correctly', function (done) {

			var image45Stub = new Resource('http://example.com/image45.jpg', 'local/image45.jpg');
			var image150Stub = new Resource('http://example.com/image150.jpg', 'local/image150.jpg');

			sinon.stub(scraper, 'loadResource')
				.onFirstCall().returns(Promise.resolve(image45Stub))
				.onSecondCall().returns(Promise.resolve(image150Stub))
				.onThirdCall().returns(Promise.resolve(image45Stub));

			var html = '\
				<html> \
				<body> \
					<img src="http://example.com/image45.jpg" \
					srcset="http://example.com/image150.jpg 150w, http://example.com/image45.jpg 45w" \
					sizes="(max-width: 45px) 100vw, 45px" width="45" height="45"> \
				</body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function () {
				var text = po.getText();

				text.should.not.containEql('http://example.com/image45.jpg');
				text.should.not.containEql('http://example.com/image150.jpg');
				text.should.containEql('src="local/image45.jpg"');
				text.should.containEql('srcset="local/image150.jpg 150w, local/image45.jpg 45w"');

				done();
			}).catch(done);
		});

	});
});
