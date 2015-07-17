require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var Scraper = require('../lib/scraper');
var Resource = require('../lib/resource');
var loadCss = require('../lib/file-handlers/css');

var testDirname = __dirname + '/.css-test';
var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: testDirname,
	subdirectories: [
		{ directory: 'local', extensions: ['.jpg'] }
	]
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
			nock('http://other-domain.com').get('/public/img/a.jpg').reply(200, 'OK');
			nock('http://other-domain.com').get('/b.jpg').reply(200, 'OK');
			nock('http://example.com').get('/images/c.jpg').once().reply(200, 'OK');

			var css = '\
				.a {background: url("http://other-domain.com/public/img/a.jpg")} \
				.b {background: url("http://other-domain.com/b.jpg")}\
				.c {background: url("images/c.jpg")}\
			';

			var po = new Resource('http://example.com', '1.css');
			po.setText(css);

			return loadCss(scraper, po).then(function(){
				var text = po.getText();
				text.should.not.containEql('http://other-domain.com/public/img/a.jpg');
				text.should.not.containEql('http://other-domain.com/b.jpg');
				text.should.not.containEql('images/c.jpg');
				text.should.containEql('local/a.jpg');
				text.should.containEql('local/b.jpg');
				text.should.containEql('local/c.jpg');
				done();
			}).catch(done);
		});
	});
});
