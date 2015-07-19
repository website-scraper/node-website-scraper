var should = require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var _ = require('underscore');
var Scraper = require('../lib/scraper');
var Resource = require('../lib/resource');

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
		it('should return resolved promise if everything is ok', function (done) {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.validate().then(function() {
				should(true).eql(true);
				done();
			}).catch(function() {
				done(new Error('Promise should not be rejected'));
			});
		});

		it('should return rejected promise if directory exists', function (done) {
			fs.mkdirpSync(testDirname);

			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.validate().then(function() {
				done(new Error('Promise should not be resolved'));
			}).catch(function(err) {
				err.should.be.an.instanceOf(Error);
				done();
			});
		});


		it('should return rejected promise if no directory was provided', function (done) {
			var s = new Scraper({
				urls: urls
			});

			s.validate().then(function() {
				done(new Error('Promise should not be resolved'));
			}).catch(function(err) {
				err.should.be.an.instanceOf(Error);
				done();
			});
		});
	});

	describe('#prepare', function() {
		it('should create directory', function(done) {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.prepare().then(function() {
				var exists = fs.existsSync(testDirname);
				exists.should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should create an Array of urls if string was passed', function(done) {
			var s = new Scraper({
				urls: 'http://not-array-url.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				s.options.urls.should.be.an.instanceOf(Array).and.have.length(1);
				done();
			}).catch(done);
		});

		it('should create Resource object for each url', function(done) {
			var s = new Scraper({
				urls: [
					'http://first-url.com',
					{ url: 'http://second-url.com' },
					{ url: 'http://third-url.com' }
				],
				directory: testDirname
			});

			s.prepare().then(function() {
				s.originalResources.should.be.an.instanceOf(Array).and.have.length(3);
				s.originalResources[0].should.be.an.instanceOf(Resource);
				s.originalResources[1].should.be.an.instanceOf(Resource);
				s.originalResources[2].should.be.an.instanceOf(Resource);
				_.where(s.originalResources, { url: 'http://first-url.com' }).should.have.length(1);
				_.where(s.originalResources, { url: 'http://second-url.com' }).should.have.length(1);
				_.where(s.originalResources, { url: 'http://third-url.com' }).should.have.length(1);
				done();
			}).catch(done);
		});

		it('should use urls filename', function(done) {
			var s = new Scraper({
				urls: { url: 'http://first-url.com', filename: 'first.html' },
				directory: testDirname
			});

			s.prepare().then(function() {
				s.originalResources[0].getFilename().should.be.eql('first.html');
				done();
			}).catch(done);
		});

		it('should use default filename if no url filename was provided', function(done) {
			var s = new Scraper({
				urls: { url: 'http://first-url.com' },
				defaultFilename: 'default.html',
				directory: testDirname
			});

			s.prepare().then(function() {
				s.originalResources[0].getFilename().should.be.eql('default.html');
				done();
			}).catch(done);
		});
	});

	describe('#load', function() {
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
			s.prepare().then(s.load).then(function() {
				loadResourceSpy.calledTwice.should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should return array of objects with url and filename', function(done) {
			nock('http://first-url.com').get('/').reply(200, 'OK');
			nock('http://second-url.com').get('/').reply(500);

			var s = new Scraper({
				urls: [
					'http://first-url.com',
					'http://second-url.com'
				],
				directory: testDirname
			});

			s.prepare().then(s.load).then(function(res) {
				res.should.be.instanceOf(Array);
				res.should.have.length(2);
				res[0].should.have.properties(['url', 'filename']);
				res[1].should.have.properties(['url', 'filename']);
				done();
			}).catch(done);
		});
	});

	describe('#errorCleanup', function() {
		it('should throw error', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				return s.errorCleanup(new Error('everything was broken!'));
			}).then(function() {
				done(new Error('Promise should not be resolved'));
			}).catch(function(err) {
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('everything was broken!');
				done();
			});
		});

		it('should remove directory if error occurs and something was loaded', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				s.addLoadedResource(new Resource('http://some-resource.com'));
				fs.existsSync(testDirname).should.be.eql(true);
				return s.errorCleanup();
			}).then(function() {
				done(new Error('Promise should not be resolved'));
			}).catch(function() {
				fs.existsSync(testDirname).should.be.eql(false);
				done();
			});
		});

		it('should not remove directory if error occurs and nothing was loaded', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				fs.existsSync(testDirname).should.be.eql(true);
				return s.errorCleanup();
			}).then(function() {
				done(new Error('Promise should not be resolved'));
			}).catch(function() {
				fs.existsSync(testDirname).should.be.eql(true);
				done();
			});
		});
	});

	describe('#getLoadedResource', function() {
		it('should find nothing if no resource with same url was loaded',function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				var a = new Resource('http://first-resource.com');
				var loaded = s.getLoadedResource(a);
				should(loaded).be.empty;
				done();
			}).catch(done);
		});

		it('should find loaded resource with same url', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				var a = new Resource('http://first-resource.com');
				s.addLoadedResource(a);

				var b = new Resource('http://first-resource.com');
				var c = new Resource('http://first-resource.com/');
				var d = new Resource('http://first-resource.com?');
				should(s.getLoadedResource(b)).be.equal(a);
				should(s.getLoadedResource(c)).be.equal(a);
				should(s.getLoadedResource(d)).be.equal(a);

				done();
			}).catch(done);
		});
	});
});

