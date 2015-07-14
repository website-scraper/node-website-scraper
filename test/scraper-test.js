var should = require('should');
var fs = require('fs-extra');
var _ = require('underscore');
var Scraper = require('../lib/scraper');
var PageObject = require('../lib/page-object');

var testDirname = __dirname + '/.tmp/scraper';
var urls = [ 'http://example.com' ];

describe('Scraper', function () {

	afterEach(function() {
		return fs.removeSync(testDirname);
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

	describe('#beforeLoad', function() {
		it('should create directory', function(done) {
			var s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.beforeLoad().then(function() {
				var exists = fs.existsSync(testDirname);
				exists.should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should add subdirectories to loaded', function(done) {
			var s = new Scraper({
				urls: urls,
				directory: testDirname,
				subdirectories: [
					{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
					{ directory: 'js', extensions: ['.js'] },
					{ directory: 'css', extensions: ['.css'] }
				]
			});

			s.beforeLoad().then(function() {
				s.loadedPageObjects.should.have.length(3);
				_.where(s.loadedPageObjects, { filename: 'img' }).should.have.length(1);
				_.where(s.loadedPageObjects, { filename: 'js' }).should.have.length(1);
				_.where(s.loadedPageObjects, { filename: 'css' }).should.have.length(1);
				done();
			}).catch(done);
		});

		it('should create an Array of urls if string was passed', function(done) {
			var s = new Scraper({
				urls: 'http://not-array-url.com',
				directory: testDirname
			});

			s.beforeLoad().then(function() {
				s.options.urls.should.be.an.instanceOf(Array).and.have.length(1);
				done();
			}).catch(done);
		});

		it('should create PageObjects for each url', function(done) {
			var s = new Scraper({
				urls: [
					'http://first-url.com',
					{ url: 'http://second-url.com' },
					{ url: 'http://third-url.com' }
				],
				directory: testDirname
			});

			s.beforeLoad().then(function() {
				s.originalPageObjects.should.be.an.instanceOf(Array).and.have.length(3);
				s.originalPageObjects[0].should.be.an.instanceOf(PageObject);
				s.originalPageObjects[1].should.be.an.instanceOf(PageObject);
				s.originalPageObjects[2].should.be.an.instanceOf(PageObject);
				_.where(s.originalPageObjects, { url: 'http://first-url.com' }).should.have.length(1);
				_.where(s.originalPageObjects, { url: 'http://second-url.com' }).should.have.length(1);
				_.where(s.originalPageObjects, { url: 'http://third-url.com' }).should.have.length(1);
				done();
			}).catch(done);
		});

		it('should use urls filename', function(done) {
			var s = new Scraper({
				urls: { url: 'http://first-url.com', filename: 'first.html' },
				directory: testDirname
			});

			s.beforeLoad().then(function() {
				s.originalPageObjects[0].getFilename().should.be.eql('first.html');
				done();
			}).catch(done);
		});

		it('should use default filename if no url filename was provided', function(done) {
			var s = new Scraper({
				urls: { url: 'http://first-url.com' },
				defaultFilename: 'default.html',
				directory: testDirname
			});

			s.beforeLoad().then(function() {
				s.originalPageObjects[0].getFilename().should.be.eql('default.html');
				done();
			}).catch(done);
		});
	});
});

