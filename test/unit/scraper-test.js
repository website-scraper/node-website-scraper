var should = require('should');
var sinon = require('sinon');
require('sinon-as-promised');
var nock = require('nock');
var proxyquire = require('proxyquire');
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var Scraper = require('../../lib/scraper');
var Resource = require('../../lib/resource');

var testDirname = __dirname + '/.scraper-test';
var urls = [ 'http://example.com' ];

describe('Scraper', function () {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	describe('#validate', function () {
		it('should return resolved promise if everything is ok', function () {
			var s = new Scraper({
				urls: urls,
				directory: 'good/directory'
			});

			return s.validate().then(function() {
				should(true).eql(true);
			});
		});

		it('should return rejected promise if no directory was provided', function () {
			var s = new Scraper({
				urls: urls
			});

			return s.validate().then(function() {
				should(true).be.eql(false);
			}, function(err) {
				err.should.be.an.instanceOf(Error);
				err.message.should.match(/^Incorrect directory/);
			});
		});

		it('should return rejected promise if directory is not correct', function () {
			var s1 = new Scraper({
				urls: urls,
				directory: ''
			});

			return s1.validate().then(function() {
				should(true).be.eql(false);
			}, function(err) {
				err.should.be.an.instanceOf(Error);
				err.message.should.match(/^Incorrect directory/);
			});

			var s2 = new Scraper({
				urls: urls,
				directory: { name: '/incorrect/directory' }
			});

			return s2.validate().then(function() {
				should(true).be.eql(false);
			}, function(err) {
				err.should.be.an.instanceOf(Error);
				err.message.should.match(/^Incorrect directory/);
			});

			var s3 = new Scraper({
				urls: urls,
				directory: 42
			});

			return s3.validate().then(function() {
				should(true).be.eql(false);
			}, function(err) {
				err.should.be.an.instanceOf(Error);
				err.message.should.match(/^Incorrect directory/);
			});
		});

		it('should return rejected promise if directory exists', function() {
			fs.mkdirpSync(testDirname);

			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			return s.validate().then(function() {
				should(true).be.eql(false);
			}, function(err) {
				err.should.be.an.instanceOf(Error);
				err.message.should.match(/^Directory (.*?) exists/);
			});
		});
	});

	describe('#load', function() {
		it('should create directory', function() {
			nock('http://example.com').get('/').reply(200, 'OK');
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			return s.load().then(function() {
				var exists = fs.existsSync(testDirname);
				exists.should.be.eql(true);
			});
		});

		it('should call loadResource for each url', function(done) {
			nock('http://first-url.com').get('/').reply(200, 'OK');
			nock('http://second-url.com').get('/').reply(200, 'OK');

			var s = new Scraper({
				urls: [
					'http://first-url.com',
					'http://second-url.com'
				],
				directory: testDirname
			});

			var loadResourceSpy = sinon.spy(s, 'loadResource');
			s.load().then(function() {
				loadResourceSpy.calledTwice.should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should return array of objects with url, filename and assets', function(done) {
			nock('http://first-url.com').get('/').reply(200, 'OK');
			nock('http://second-url.com').get('/').reply(500);

			var s = new Scraper({
				urls: [
					'http://first-url.com',
					'http://second-url.com'
				],
				directory: testDirname
			});

			s.load().then(function(res) {
				res.should.be.instanceOf(Array);
				res.should.have.length(2);
				res[0].should.be.instanceOf(Resource).and.have.properties(['url', 'filename', 'assets']);
				res[1].should.be.instanceOf(Resource).and.have.properties(['url', 'filename', 'assets']);
				done();
			}).catch(done);
		});
	});

	describe('#errorCleanup', function() {
		it('should throw error', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			return s.errorCleanup(new Error('everything was broken!')).then(function() {
				should(true).be.eql(false);
			}, function(err) {
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('everything was broken!');
			});
		});

		it('should remove directory if error occurs and something was loaded', function() {
			nock('http://example.com').get('/').reply(200, 'OK');
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			fs.existsSync(testDirname).should.be.eql(false);

			return s.load().then(function() {
				var resource = new Resource('http://some-resource.com');
				s.addLoadedResource(resource);
				fs.existsSync(testDirname).should.be.eql(true);
				return s.errorCleanup(new Error('everything was broken!'));
			}).then(function() {
				should(true).be.eql(false);
			}).catch(function(err) {
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('everything was broken!');
				fs.existsSync(testDirname).should.be.eql(false);
			});
		});

		it('should not remove directory if error occurs and nothing was loaded', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			fs.mkdirpSync(testDirname);
			fs.existsSync(testDirname).should.be.eql(true);

			return s.errorCleanup(new Error('everything was broken!')).then(function() {
				should(true).be.eql(false);
			}).catch(function(err) {
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('everything was broken!');
				fs.existsSync(testDirname).should.be.eql(true);
			});
		});
	});

	describe('#getLoadedResource', function() {
		it('should find nothing if no resource with same url was loaded',function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			var a = new Resource('http://first-resource.com');
			var loaded = s.getLoadedResourcePromise(a.getUrl());
			should(loaded).be.eql(undefined);
		});

		it('should find loaded resource with same url', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var a = new Resource('http://first-resource.com');
			s.addLoadedResourcePromise(a.getUrl(), a);

			var b = new Resource('http://first-resource.com');
			var c = new Resource('http://first-resource.com/');
			var d = new Resource('http://first-resource.com?');
			should(s.getLoadedResourcePromise(b.getUrl())).be.equal(a);
			should(s.getLoadedResourcePromise(c.getUrl())).be.equal(a);
			should(s.getLoadedResourcePromise(d.getUrl())).be.equal(a);
		});
	});

	describe('#loadResource', function() {
		it('should load resource', function() {
			nock('http://example.com').get('/a.png').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var r = new Resource('http://example.com/a.png');
			return s.loadResource(r).then(function(lr) {
				lr.should.be.eql(r);
				lr.getUrl().should.be.eql('http://example.com/a.png');
				lr.getFilename().should.be.not.empty();
				lr.getText().should.be.eql('OK');

				var text = fs.readFileSync(path.join(testDirname, lr.getFilename())).toString();
				text.should.be.eql(lr.getText());
			});
		});

		it('should not load the same resource twice (should return already loaded)', function() {
			nock('http://example.com').get('/a.png').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var r1 = new Resource('http://example.com/a.png');
			var r2 = new Resource('http://example.com/a.png');
			return s.loadResource(r1).then(function() {
				return s.loadResource(r2).then(function(lr) {
					lr.should.be.equal(r1);
					lr.should.not.be.equal(r2);
				});
			});
		});

		it('should load the resource if the urlFilter returns true', function(){
			nock('http://example.com').get('/a.png').reply(200, 'OK');

			var s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname,
				urlFilter: function(){
					return true;
				}
			});

			var r = new Resource('http://example.com/a.png');
			return s.loadResource(r).then(function(lr) {
				lr.should.be.eql(r);
				lr.getUrl().should.be.eql('http://example.com/a.png');
				lr.getFilename().should.be.not.empty();
				lr.getText().should.be.eql('OK');

				var text = fs.readFileSync(path.join(testDirname, lr.getFilename())).toString();
				text.should.be.eql(lr.getText());
			});
		});

		it('should return promise resolved with null if the urlFilter returns false', function(){
			var s = new Scraper({
				urls: ['http://google.com'],
				directory: testDirname,
				urlFilter: function(){
					return false;
				}
			});

			var r = new Resource('http://google.com/a.png');
			return s.loadResource(r).then(function(lr) {
				should.equal(lr, null);
			});
		});
	});

	describe('#getResourceHandler', function() {
		var Scraper;
		var noopStub;
		var cssLoadStub;
		var htmlLoadStub;

		beforeEach(function() {
			noopStub = sinon.stub().resolves();
			cssLoadStub = sinon.stub().resolves();
			htmlLoadStub = sinon.stub().resolves();

			Scraper = proxyquire('../../lib/scraper', {
				'lodash': {
					'noop': noopStub
				},
				'./file-handlers/html': htmlLoadStub,
				'./file-handlers/css': cssLoadStub
			});
		});

		it('should return noop if resource has depth > max', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				maxDepth: 2
			});

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('html');
			sinon.stub(r, 'getDepth').returns(10);

			return s.getResourceHandler(r).call(s, r).then(function() {
				noopStub.called.should.be.eql(true);
				cssLoadStub.called.should.be.eql(false);
				htmlLoadStub.called.should.be.eql(false);
			});
		});

		it('should return css loader if file has css type', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				maxDepth: 2
			});

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('css');
			sinon.stub(r, 'getDepth').returns(1);

			return s.getResourceHandler(r).call(s, r).then(function() {
				noopStub.called.should.be.eql(false);
				cssLoadStub.called.should.be.eql(true);
				htmlLoadStub.called.should.be.eql(false);
			});
		});

		it('should return html & css loader if file has html type', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				maxDepth: 2
			});

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('html');
			sinon.stub(r, 'getDepth').returns(1);

			return s.getResourceHandler(r).call(s, r).then(function() {
				noopStub.called.should.be.eql(false);
				cssLoadStub.called.should.be.eql(true);
				htmlLoadStub.called.should.be.eql(true);
			});
		});
	});

	describe('#scrape', function() {
		it('should call methods in sequence', function() {
			nock('http://example.com').get('/').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var validateSpy = sinon.spy(s, 'validate');
			var loadSpy = sinon.spy(s, 'load');

			return s.scrape().then(function() {
				validateSpy.calledOnce.should.be.eql(true);
				loadSpy.calledOnce.should.be.eql(true);
				loadSpy.calledAfter(validateSpy).should.be.eql(true);
			});
		});

		it('should call errorCleanup on error', function() {
			nock('http://example.com').get('/').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			sinon.stub(s, 'load').rejects(new Error('Awful error'));

			var errorCleanupSpy = sinon.spy(s, 'errorCleanup');

			return s.scrape().then(function() {
				should(true).be.eql(false);
			}).catch(function(err) {
				errorCleanupSpy.calledOnce.should.be.eql(true);
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('Awful error');
			});
		});
	});
});
