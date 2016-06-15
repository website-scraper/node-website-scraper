require('should');
var _ = require('lodash');
var Promise = require('bluebird');
var sinon = require('sinon');
require('sinon-as-promised')(Promise);
var Scraper = require('../../../lib/scraper');
var Resource = require('../../../lib/resource');
var loadHtml = require('../../../lib/file-handlers/html');

var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: __dirname + '/.html-test',
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
		scraper = new Scraper(defaultScraperOpts);
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

		it('should not call requestResource if no sources in html', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource').resolves();
			sinon.stub(scraper, 'loadResource').resolves();

			var po = new Resource('http://example.com', 'index.html');
			po.setText('');

			loadHtml(scraper, po).then(function() {
				requestResourceStub.called.should.be.eql(false);
				done();
			}).catch(done);
		});

		it('should not call requestResource if source attr is empty', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource').resolves();
			sinon.stub(scraper, 'loadResource').resolves();

			var html = ' \
				<html lang="en"> \
				<head></head> \
				<body><img src=""></body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				requestResourceStub.called.should.be.eql(false);
				done();
			}).catch(done);
		});

		it('should call requestResource once with correct params', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource').resolves();
			sinon.stub(scraper, 'loadResource').resolves();

			var html = ' \
				<html lang="en"> \
				<head></head> \
				<body><img src="test.png"></body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			loadHtml(scraper, po).then(function() {
				requestResourceStub.calledOnce.should.be.eql(true);
				requestResourceStub.args[0][0].url.should.be.eql('http://example.com/test.png');
				done();
			}).catch(done);
		});

		it('should call requestResource for each found source with correct params', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource');
			sinon.stub(scraper, 'loadResource').resolves();

			requestResourceStub.onFirstCall().resolves(new Resource('http://example.com/a.jpg', 'a.jpg'));
			requestResourceStub.onSecondCall().resolves(new Resource('http://example.com/b.css', 'b.css'));
			requestResourceStub.onThirdCall().resolves(new Resource('http://example.com/c.js', 'c.js'));

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

			var parentResource = new Resource('http://example.com', 'index.html');
			parentResource.setText(html);
			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			// order of loading is determined by order of sources in scraper options
			loadHtml(scraper, parentResource).then(function() {
				requestResourceStub.calledThrice.should.be.eql(true);
				requestResourceStub.args[0][0].url.should.be.eql('http://example.com/a.jpg');
				requestResourceStub.args[1][0].url.should.be.eql('http://example.com/b.css');
				requestResourceStub.args[2][0].url.should.be.eql('http://example.com/c.js');

				updateChildSpy.calledThrice.should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should not replace the sources in text, for which requestResource returned null', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource');
			sinon.stub(scraper, 'loadResource').resolves();

			requestResourceStub.onFirstCall().returns(Promise.resolve(null));
			requestResourceStub.onSecondCall().returns(Promise.resolve(null));
			requestResourceStub.onThirdCall().returns(Promise.resolve(new Resource('http://example.com/img/c.js', 'local/c.js')));

			var html = '\
				<html> \
				<head> \
					<link rel="stylesheet" href="http://example.com/b.css"> \
					<script src="scripts/c.js"></script>\
				</head> \
				<body> \
					<img src="http://example.com/public/img/a.jpg"> \
				</body> \
				</html>\
			';

			var parentResource = new Resource('http://example.com', 'index.html');
			parentResource.setText(html);
			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return loadHtml(scraper, parentResource).then(function(){
				var text = parentResource.getText();
				text.should.containEql('http://example.com/public/img/a.jpg');
				text.should.containEql('http://example.com/b.css');
				text.should.not.containEql('local/a.jpg');
				text.should.not.containEql('local/b.css');

				text.should.not.containEql('scripts/c.js');
				text.should.containEql('local/c.js');

				updateChildSpy.calledOnce.should.be.eql(true);

				done();
			}).catch(done);
		});

		it('should replace all sources in text with local files', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource');
			sinon.stub(scraper, 'loadResource').resolves();

			requestResourceStub.onFirstCall().returns(Promise.resolve(new Resource('http://example.com/public/img/a.jpg', 'local/a.jpg')));
			requestResourceStub.onSecondCall().returns(Promise.resolve(new Resource('http://example.com/b.css', 'local/b.css')));
			requestResourceStub.onThirdCall().returns(Promise.resolve(new Resource('http://example.com/img/c.jpg', 'local/c.js')));

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
			var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
			sinon.stub(scraper, 'loadResource').resolves();

			sinon.stub(resourceStub, 'getType').returns('html');
			sinon.stub(scraper, 'requestResource').returns(Promise.resolve(resourceStub));

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
			var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
			sinon.stub(scraper, 'loadResource').resolves();

			sinon.stub(resourceStub, 'getType').returns('other');
			sinon.stub(scraper, 'requestResource').returns(Promise.resolve(resourceStub));

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
			sinon.stub(scraper, 'loadResource').resolves();

			var image45Stub = new Resource('http://example.com/image45.jpg', 'local/image45.jpg');
			var image150Stub = new Resource('http://example.com/image150.jpg', 'local/image150.jpg');

			sinon.stub(scraper, 'requestResource')
				.onFirstCall().resolves(image45Stub)
				.onSecondCall().resolves(image150Stub)
				.onThirdCall().resolves(image45Stub);


			var html = '\
				<html> \
				<body> \
					<img src="http://example.com/image45.jpg" \
					srcset="http://example.com/image150.jpg 150w, http://example.com/image45.jpg 45w" \
					sizes="(max-width: 45px) 100vw, 45px" width="45" height="45"> \
				</body> \
				</html>\
			';

			var parentResource = new Resource('http://example.com', 'index.html');
			parentResource.setText(html);
			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return loadHtml(scraper, parentResource).then(function () {
				var text = parentResource.getText();

				updateChildSpy.calledThrice.should.be.eql(true);

				text.should.not.containEql('http://example.com/image45.jpg');
				text.should.not.containEql('http://example.com/image150.jpg');
				text.should.containEql('src="local/image45.jpg"');
				text.should.containEql('srcset="local/image150.jpg 150w, local/image45.jpg 45w"');

				done();
			}).catch(done);
		});

		it('should not replace the sources of img tags with srcset attribute, for which requestResource returned null', function (done) {
			sinon.stub(scraper, 'loadResource').resolves();
			var image150Stub = new Resource('http://example.com/image150.jpg', 'local/image150.jpg');

			sinon.stub(scraper, 'requestResource')
				.onFirstCall().resolves(null)
				.onSecondCall().resolves(image150Stub)
				.onThirdCall().resolves(null);

			var html = '\
				<html> \
				<body> \
					<img src="http://example.com/image45.jpg" \
					srcset="http://example.com/image150.jpg 150w, http://example.com/image45.jpg 45w" \
					sizes="(max-width: 45px) 100vw, 45px" width="45" height="45"> \
				</body> \
				</html>\
			';

			var parentResource = new Resource('http://example.com', 'index.html');
			parentResource.setText(html);
			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return loadHtml(scraper, parentResource).then(function () {
				var text = parentResource.getText();

				updateChildSpy.calledOnce.should.be.eql(true);

				text.should.containEql('http://example.com/image45.jpg');
				text.should.not.containEql('src="local/image45.jpg"');

				text.should.not.containEql('http://example.com/image150.jpg');
				text.should.containEql('srcset="local/image150.jpg 150w, http://example.com/image45.jpg 45w"');

				done();
			}).catch(done);
		});

		it('should not prettifyUrls by default', function(done) {
			var requestResourceStub = sinon.stub(scraper, 'requestResource');
			sinon.stub(scraper, 'loadResource').resolves();

			requestResourceStub.onFirstCall().returns(Promise.resolve(new Resource('http://example.com/other-page/index.html', 'other-page/index.html')));

			var html = ' \
				<html lang="en"> \
				<head></head> \
				<body><a href="other-page/index.html">Other page</a></body> \
				</html>\
			';
			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function () {
				var text = po.getText();
				text.should.containEql('a href="other-page/index.html"');
				done();
			}).catch(done);
		});

		it('should prettifyUrls if specified', function(done) {
			scraper = new Scraper(_.extend({
				defaultFilename: 'index.html',
				prettifyUrls: true
			}, defaultScraperOpts));

			var requestResourceStub = sinon.stub(scraper, 'requestResource');
			sinon.stub(scraper, 'loadResource').resolves();

			requestResourceStub.onFirstCall().returns(Promise.resolve(new Resource('http://example.com/other-page/index.html', 'other-page/index.html')));

			var html = ' \
				<html lang="en"> \
				<head></head> \
				<body><a href="other-page/index.html">Other page</a></body> \
				</html>\
			';

			var po = new Resource('http://example.com', 'index.html');
			po.setText(html);

			return loadHtml(scraper, po).then(function () {
				var text = po.getText();

				text.should.containEql('a href="other-page/"');

				done();
			}).catch(done);
		});
	});
});
