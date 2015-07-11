var should = require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var Scraper = require('../lib/scraper');
var PageObject = require('../lib/page-object');
var loadCss = require('../lib/file-handlers/css');

var testDirname = __dirname + '/.tmp/css';
var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: testDirname,
	subdirectories: null
};
var scraper;

describe('Css handler', function () {
	describe('#loadCss(context, pageObject)', function() {

		beforeEach(function() {
			scraper = new Scraper(defaultScraperOpts);
			return scraper.beforeLoad();
		});

		afterEach(function() {
			fs.remove(testDirname);
		});

		it('should not call loadPageObject if no sources in css', function() {
			var loadPageObjectSpy = sinon.spy(scraper, 'loadPageObject');

			var po = new PageObject('http://example.com', '1.css');
			po.setText('');

			loadCss(scraper, po);
			loadPageObjectSpy.called.should.be.eql(false);
		});

		it('should call loadPageObject once with correct params', function() {
			nock('http://example.com').get('/test.png').reply(200, 'OK');

			var loadPageObjectSpy = sinon.spy(scraper, 'loadPageObject');

			var po = new PageObject('http://example.com', '1.css');
			po.setText('div {background: url(test.png)}');

			loadCss(scraper, po);
			loadPageObjectSpy.calledOnce.should.be.eql(true);
			loadPageObjectSpy.args[0][0].url.should.be.eql('http://example.com/test.png');
		});

		it('should call loadPageObject for each found source with correct params', function() {
			nock('http://example.com').get('/a.jpg').reply(200, 'OK');
			nock('http://example.com').get('/b.jpg').reply(200, 'OK');
			nock('http://example.com').get('/c.jpg').reply(200, 'OK');

			var loadPageObjectSpy = sinon.spy(scraper, 'loadPageObject');
			var css = '\
				.a {background: url(a.jpg)} \
				.b {background: url(\'b.jpg\')}\
				.c {background: url("c.jpg")}\
			';

			var po = new PageObject('http://example.com', '1.css');
			po.setText(css);

			loadCss(scraper, po);
			loadPageObjectSpy.calledThrice.should.be.eql(true);
			loadPageObjectSpy.args[0][0].url.should.be.eql('http://example.com/a.jpg');
			loadPageObjectSpy.args[1][0].url.should.be.eql('http://example.com/b.jpg');
			loadPageObjectSpy.args[2][0].url.should.be.eql('http://example.com/c.jpg');
		});

		it('should replace all sources in text with local files', function() {
			nock('http://other-domain').get('/public/img/a.jpg').reply(200, 'OK');
			nock('http://other-domain').get('/b.jpg').reply(200, 'OK');
			nock('http://example.com').get('/images/c.jpg').once().reply(200, 'OK');

			var css = '\
				.a {background: url("http://other-domain/public/img/a.jpg")} \
				.b {background: url("http://other-domain/b.jpg")}\
				.c {background: url("images/c.jpg")}\
			';

			var po = new PageObject('http://example.com', '1.css');
			po.setText(css);

			return loadCss(scraper, po).then(function(newCssPo){
				var text = newCssPo.getText();
				text.should.not.containEql('http://other-domain/public/img/a.jpg');
				text.should.not.containEql('http://other-domain/b.jpg');
				text.should.not.containEql('images/c.jpg');
				text.should.containEql('a.jpg');
				text.should.containEql('a.jpg');
				text.should.containEql('a.jpg');
			});
		});
	});
});
