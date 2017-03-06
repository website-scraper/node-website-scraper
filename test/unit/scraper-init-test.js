var should = require('should');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var path = require('path');
var Scraper = require('../../lib/scraper');
var Resource = require('../../lib/resource');

var testDirname = __dirname + '/.scraper-init-test';
var urls = [ 'http://example.com' ];

describe('Scraper initialization', function () {
	describe('defaultFilename', function() {
		var defaultsMock, Scraper;

		before(function() {
			defaultsMock = { defaultFilename: 'dummyFilename.txt' };
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default defaultFilename if no defaultFilename were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.defaultFilename.should.equalFileSystemPath(defaultsMock.defaultFilename);
		});

		it('should use defaultFilename sources if defaultFilename were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				defaultFilename: 'myNewFileName.txt'
			});

			s.options.defaultFilename.should.equalFileSystemPath('myNewFileName.txt');
		});
	});

	describe('sources', function() {
		var defaultsMock, Scraper;

		before(function() {
			defaultsMock = { sources: ['1', '2', '3'] };
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default sources if no sources were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.sources.should.eql(defaultsMock.sources);
		});

		it('should use passed sources if sources were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				sources: [ { selector: 'img', attr: 'src' } ]
			});

			s.options.sources.should.eql([ { selector: 'img', attr: 'src' } ]);
		});

		it('should extend sources if recursive flag is set', function() {
			var s = new Scraper({
				urls: { url: 'http://first-url.com' },
				directory: testDirname,
				sources: [
					{ selector: 'img', attr: 'src' }
				],
				recursive: true
			});

			s.options.sources.should.have.length(2);
			s.options.sources.should.containEql({ selector: 'img', attr: 'src' });
			s.options.sources.should.containEql({ selector: 'a', attr: 'href' });
		});
	});

	describe('subdirectories', function () {
		var defaultsMock, Scraper;

		before(function() {
			defaultsMock = { directories: { directory: 'dir', extensions: ['.txt'] }, };
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default subdirectories if no subdirectories were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.subdirectories.should.eql(defaultsMock.subdirectories);
		});

		it('should use passed subdirectories if subdirectories were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				subdirectories: [ { directory: 'js', extensions: ['.js'] } ]
			});

			s.options.subdirectories.should.eql([ { directory: 'js', extensions: ['.js'] } ]);
		});

		it('should use null if null was passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				subdirectories: null
			});

			should(s.options.subdirectories).eql(null);
		});
	});

	describe('request', function () {
		var defaultsMock, Scraper;

		before(function() {
			defaultsMock = { request: { a: 1, b: 2 } };
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default request if no request were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.request.should.eql(defaultsMock.request);
		});

		it('should merge default and passed objects if request were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				request: {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
					}
				}
			});

			s.options.request.should.eql({
				a: 1,
				b: 2,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
				}
			});
		});

		it('should override existing properties if request were passed', function () {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				request: {
					a: 555
				}
			});

			s.options.request.should.eql({
				a: 555,
				b: 2
			});
		});
	});

	describe('resourceHandler', function () {
		it('should create resourceHandler with correct params', function() {
			var ResourceHandlerStub = sinon.stub();
			var Scraper = proxyquire('../../lib/scraper', {
				'./resource-handler': ResourceHandlerStub
			});

			var options = {
				urls: { url: 'http://first-url.com' },
				directory: testDirname,
				maxDepth: 100
			};

			var s = new Scraper(options);
			ResourceHandlerStub.calledOnce.should.be.eql(true);
			ResourceHandlerStub.args[0][0].should.be.eql(s.options);
			ResourceHandlerStub.args[0][1].should.be.eql(s);
		});
	});

	describe('urls', function () {
		it('should create an Array of urls if string was passed', function() {
			var s = new Scraper({
				urls: 'http://not-array-url.com',
				directory: testDirname
			});

			s.options.urls.should.be.an.instanceOf(Array).and.have.length(1);
			s.options.urls[0].should.be.eql('http://not-array-url.com');
		});
	});

	describe('originalResources', function () {
		it('should create Resource object for each url', function() {
			var s = new Scraper({
				urls: [
					'http://first-url.com',
					{ url: 'http://second-url.com' },
					{ url: 'http://third-url.com' }
				],
				directory: testDirname
			});

			s.originalResources.should.be.an.instanceOf(Array).and.have.length(3);
			s.originalResources[0].should.be.an.instanceOf(Resource);
			s.originalResources[0].url.should.be.eql('http://first-url.com');
			s.originalResources[1].should.be.an.instanceOf(Resource);
			s.originalResources[1].url.should.be.eql('http://second-url.com');
			s.originalResources[2].should.be.an.instanceOf(Resource);
			s.originalResources[2].url.should.be.eql('http://third-url.com');
		});

		it('should use urls filename', function() {
			var s = new Scraper({
				urls: { url: 'http://first-url.com', filename: 'first.html' },
				directory: testDirname
			});
			s.originalResources[0].getFilename().should.equalFileSystemPath('first.html');
		});

		it('should use default filename if no url filename was provided', function() {
			var s = new Scraper({
				urls: { url: 'http://first-url.com' },
				defaultFilename: 'default.html',
				directory: testDirname
			});
			s.originalResources[0].getFilename().should.equalFileSystemPath('default.html');
		});
	});
});