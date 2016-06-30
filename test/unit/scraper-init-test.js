var should = require('should');
var proxyquire = require('proxyquire');
var path = require('path');
var Scraper = require('../../lib/scraper');

var testDirname = __dirname + '/.scraper-init-test';
var urls = [ 'http://example.com' ];

describe('Scraper initialization', function () {

	describe('directory', function() {
		var currentProcessDir = process.cwd();

		it('should use absolute path for directory if directory is empty string', function () {
			var s1 = new Scraper({
				urls: urls,
				directory: ''
			});
			var expected1 = currentProcessDir;
			s1.options.directory.should.equalFileSystemPath(expected1);
		});

		it('should use absolute path for directory if directory contains relative path', function () {
			var s2 = new Scraper({
				urls: urls,
				directory: 'my/relative/path'
			});
			var expected2 = path.join(currentProcessDir, 'my/relative/path');
			s2.options.directory.should.equalFileSystemPath(expected2);
		});

		it('should use absolute path for directory if directory contains absolute path', function () {
			var s3 = new Scraper({
				urls: urls,
				directory: '/my/absolute/path'
			});
			var expected3 = '/my/absolute/path';
			s3.options.directory.should.equalFileSystemPath(expected3);
		});
	});

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
	});

	describe('subdirectories', function() {
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
});