require('should');
var Promise = require('bluebird');
var sinon = require('sinon');
require('sinon-as-promised')(Promise);
var Scraper = require('../../../lib/scraper');
var Resource = require('../../../lib/resource');
var loadCss = require('../../../lib/resource-handler/css');

var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: __dirname + '/.css-test'
};
var scraper;

describe('Css handler', function () {

	beforeEach(function() {
		scraper = new Scraper(defaultScraperOpts);
		sinon.stub(scraper, 'loadResource').resolves();
	});

	describe('#loadCss', function() {

		// TODO migrate test to css-test path-container
		it('should replace all occurencies of the same sources in text with local files', function() {
			sinon.stub(scraper, 'requestResource').resolves(new Resource('http://example.com/img.jpg', 'local/img.jpg'));

			var css = '\
				.a {background: url("http://example.com/img.jpg")} \
				.b {background: url("http://example.com/img.jpg")}\
				.c {background: url("http://example.com/img.jpg")}\
			';

			var po = new Resource('http://example.com', '1.css');
			po.setText(css);

			return loadCss(scraper, po).then(function(){
				var text = po.getText();
				var numberOfLocalResourceMatches = text.match(/local\/img.jpg/g).length;

				text.should.not.containEql('http://example.com/img.jpg');
				text.should.containEql('local/img.jpg');
				numberOfLocalResourceMatches.should.be.eql(3);
			});
		});

		// TODO migrate test to css-test path-container
		it('should replace resource only if it completely equals to path (should not change partially matched names)', function() {
			// Next order of urls will be returned by css-url-parser
			// 'style.css', 'mystyle.css', 'another-style.css', 'image.png', 'another-image.png', 'new-another-image.png'

			// Order of args for calling loadStub depends on order of css urls
			// first time it will be called with cssUrls[0], second time -> cssUrls[1]
			var loadStub = sinon.stub(scraper, 'requestResource');
			loadStub.onCall(0).resolves(new Resource('http://example.com/style.css', 'local/style.css'));
			loadStub.onCall(1).resolves(new Resource('http://example.com/mystyle.css', 'local/mystyle.css'));
			loadStub.onCall(2).resolves(new Resource('http://example.com/another_style.css', 'local/another_style.css'));
			loadStub.onCall(3).resolves(new Resource('http://example.com/image.png', 'local/image.png'));
			loadStub.onCall(4).resolves(new Resource('http://example.com/another-image.png', 'local/another-image.png'));
			loadStub.onCall(5).resolves(new Resource('http://example.com/new-another-image.png', 'local/new-another-image.png'));

			var css = '\
				@import "style.css";     \
				@import \'style.css\';   \
				@import \'mystyle.css\'; \
				@import url(\'style.css\') ;\
				@import url(\'another-style.css\'); \
				.a {background: url("image.png")} ;\
				.b {background: url(image.png)}; \
				.c {background: url("another-image.png")};\
				.d {background: url(\'new-another-image.png\')};\
			';

			var po = new Resource('http://example.com', '1.css');
			po.setText(css);

			return loadCss(scraper, po).then(function(){
				var text = po.getText();

				text.should.containEql('@import "local/style.css"');
				text.should.containEql('@import \'local/style.css\'');
				text.should.containEql('@import \'local/mystyle.css\'');
				text.should.containEql('@import url(\'local/style.css\')');
				text.should.containEql('@import url(\'local/another_style.css\')');

				text.should.containEql('.a {background: url("local/image.png")}');
				text.should.containEql('.b {background: url(local/image.png)}');
				text.should.containEql('.c {background: url("local/another-image.png")}');
				text.should.containEql('.d {background: url(\'local/new-another-image.png\')}');
			});
		});
	});
});
