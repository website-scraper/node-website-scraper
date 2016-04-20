require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var Promise = require('bluebird');
var Scraper = require('../../../lib/scraper');
var Resource = require('../../../lib/resource');
var loadCss = require('../../../lib/file-handlers/css');

var testDirname = __dirname + '/.css-test';
var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: testDirname
};
var scraper;

describe('Css handler', function () {

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

	describe('#loadCss(context, resource)', function() {

		it('should not call loadResource if no sources in css', function(done) {
			var loadResourceSpy = sinon.spy(scraper, 'loadResource');

			var po = new Resource('http://example.com', '1.css');
			po.setText('');

			loadCss(scraper, po).then(function() {
				loadResourceSpy.called.should.be.eql(false);
				done();
			}).catch(done);
		});

		it('should call loadResource once with correct params', function(done) {
			nock('http://example.com').get('/test.png').reply(200, 'OK');

			var loadResourceSpy = sinon.spy(scraper, 'loadResource');

			var po = new Resource('http://example.com', '1.css');
			po.setText('div {background: url(test.png)}');

			loadCss(scraper, po).then(function() {
				loadResourceSpy.calledOnce.should.be.eql(true);
				loadResourceSpy.args[0][0].url.should.be.eql('http://example.com/test.png');
				done();
			}).catch(done);
		});

		it('should call loadResource for each found source with correct params', function(done) {
			nock('http://example.com').get('/a.jpg').reply(200, 'OK');
			nock('http://example.com').get('/b.jpg').reply(200, 'OK');
			nock('http://example.com').get('/c.jpg').reply(200, 'OK');

			var loadResourceSpy = sinon.spy(scraper, 'loadResource');
			var css = '\
				.a {background: url(a.jpg)} \
				.b {background: url(\'b.jpg\')}\
				.c {background: url("c.jpg")}\
			';

			var po = new Resource('http://example.com', '1.css');
			po.setText(css);

			loadCss(scraper, po).then(function() {
				loadResourceSpy.calledThrice.should.be.eql(true);
				loadResourceSpy.args[0][0].url.should.be.eql('http://example.com/a.jpg');
				loadResourceSpy.args[1][0].url.should.be.eql('http://example.com/b.jpg');
				loadResourceSpy.args[2][0].url.should.be.eql('http://example.com/c.jpg');
				done();
			}).catch(done);
		});

		it('should replace all sources in text with local files', function(done) {
			nock('http://first.com').get('/img/a.jpg').reply(200, 'OK');
			nock('http://first.com').get('/b.jpg').reply(200, 'OK');
			nock('http://second.com').get('/img/c.jpg').once().reply(200, 'OK');

			var loadStub = sinon.stub(scraper, 'loadResource');
			loadStub.onFirstCall().returns(Promise.resolve(new Resource('http://first.com/img/a.jpg', 'local/a.jpg')));
			loadStub.onSecondCall().returns(Promise.resolve(new Resource('http://first.com/b.jpg', 'local/b.jpg')));
			loadStub.onThirdCall().returns(Promise.resolve(new Resource('http://second.com/img/c.jpg', 'local/c.jpg')));

			var css = '\
				.a {background: url("http://first.com/img/a.jpg")} \
				.b {background: url("http://first.com/b.jpg")}\
				.c {background: url("img/c.jpg")}\
			';

			var po = new Resource('http://example.com', '1.css');
			po.setText(css);

			return loadCss(scraper, po).then(function(){
				var text = po.getText();
				text.should.not.containEql('http://first.com/img/a.jpg');
				text.should.not.containEql('http://first.com/b.jpg');
				text.should.not.containEql('img/c.jpg');
				text.should.containEql('local/a.jpg');
				text.should.containEql('local/b.jpg');
				text.should.containEql('local/c.jpg');
				done();
			}).catch(done);
		});

		it('should replace all occurencies of the same sources in text with local files', function(done) {
			sinon.stub(scraper, 'loadResource').returns(Promise.resolve(new Resource('http://example.com/img.jpg', 'local/img.jpg')));

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
				done();
			}).catch(done);
		});

		it('should replace resource only if it completely equals to path (should not change partially matched names)', function(done) {

			var loadStub = sinon.stub(scraper, 'loadResource');
			loadStub.onCall(0).returns(Promise.resolve(new Resource('http://example.com/style.css', 'local/style.css')));
			loadStub.onCall(1).returns(Promise.resolve(new Resource('http://example.com/style.css', 'local/style.css')));
			loadStub.onCall(2).returns(Promise.resolve(new Resource('http://example.com/mystyle.css', 'local/mystyle.css')));
			loadStub.onCall(3).returns(Promise.resolve(new Resource('http://example.com/style.css', 'local/style.css')));
			loadStub.onCall(4).returns(Promise.resolve(new Resource('http://example.com/another_style.css', 'local/another_style.css')));
			loadStub.onCall(5).returns(Promise.resolve(new Resource('http://example.com/image.png', 'local/image.png')));
			loadStub.onCall(6).returns(Promise.resolve(new Resource('http://example.com/image.png', 'local/image.png')));
			loadStub.onCall(7).returns(Promise.resolve(new Resource('http://example.com/another-image.png', 'local/another-image.png')));
			loadStub.onCall(8).returns(Promise.resolve(new Resource('http://example.com/new-another-image.png', 'local/new-another-image.png')));

			var css = '\
				@import "style.css"     \
				@import style.css       \
				@import \'mystyle.css\' \
				@import (\'style.css\') \
				@import url(\'another-style.css\') \
				.a {background: url("image.png")} \
				.b {background: url(image.png)} \
				.c {background: url("another-image.png")}\
				.d {background: url(\'new-another-image.png\')}\
			';

			var po = new Resource('http://example.com', '1.css');
			po.setText(css);

			return loadCss(scraper, po).then(function(){
				var text = po.getText();

				text.should.containEql('@import "local/style.css"');
				text.should.containEql('@import local/style.css');
				text.should.containEql('@import \'local/mystyle.css\'');
				text.should.containEql('@import (\'local/style.css\') ');
				text.should.containEql('@import url(\local/another_style.css\')');

				text.should.containEql('.a {background: url("local/image.png")}');
				text.should.containEql('.b {background: url(local/image.png)}');
				text.should.containEql('.c {background: url("local/another-image.png")}');
				text.should.containEql('.d {background: url(\'local/new-another-image.png\')}');

				done();
			}).catch(done);
		});
	});
});
