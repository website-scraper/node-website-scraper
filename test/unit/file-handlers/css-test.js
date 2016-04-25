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

			var parentResource = new Resource('http://example.com', '1.css');
			parentResource.setText(css);
			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return loadCss(scraper, parentResource).then(function(){
				var text = parentResource.getText();
				text.should.not.containEql('http://first.com/img/a.jpg');
				text.should.not.containEql('http://first.com/b.jpg');
				text.should.not.containEql('img/c.jpg');
				text.should.containEql('local/a.jpg');
				text.should.containEql('local/b.jpg');
				text.should.containEql('local/c.jpg');

				updateChildSpy.calledThrice.should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should not replace the sources in text, for which loadResource returned null', function(done) {
			nock('http://second.com').get('/img/c.jpg').once().reply(200, 'OK');

			var loadStub = sinon.stub(scraper, 'loadResource');
			loadStub.onFirstCall().returns(Promise.resolve(null));
			loadStub.onSecondCall().returns(Promise.resolve(null));
			loadStub.onThirdCall().returns(Promise.resolve(new Resource('http://second.com/img/c.jpg', 'local/c.jpg')));

			var css = '\
				.a {background: url("http://first.com/img/a.jpg")} \
				.b {background: url("http://first.com/b.jpg")}\
				.c {background: url("img/c.jpg")}\
			';

			var parentResource = new Resource('http://example.com', '1.css');
			parentResource.setText(css);
			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return loadCss(scraper, parentResource).then(function(){
				var text = parentResource.getText();
				text.should.containEql('http://first.com/img/a.jpg');
				text.should.containEql('http://first.com/b.jpg');
				text.should.not.containEql('local/a.jpg');
				text.should.not.containEql('local/b.jpg');

				text.should.not.containEql('img/c.jpg');
				text.should.containEql('local/c.jpg');

				updateChildSpy.calledOnce.should.be.eql(true);
				
				done();
			}).catch(done);
		});
	});
});
