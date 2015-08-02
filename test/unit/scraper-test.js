var should = require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
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
			s.prepare().bind(s).then(s.load).then(function() {
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

			s.prepare().bind(s).then(s.load).then(function(res) {
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
				should(loaded).be.empty();
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

	describe('#getOccupiedFilenames', function() {
		it('should return empty array if nothing loaded and no subdirectories', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: null
			});

			s.prepare().then(function() {
				var occupied = s.getOccupiedFilenames();
				occupied.should.be.instanceOf(Array);
				occupied.should.be.empty();
				done();
			}).catch(done);
		});

		it('should contain all filenames for loaded resources', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: null
			});

			s.prepare().then(function() {
				var a = new Resource('http://first-resource.com', 'first.html');
				var b = new Resource('http://second-resource.com', 'second.html');
				var c = new Resource('http://third-resource.com', 'third.html');
				s.addLoadedResource(a);
				s.addLoadedResource(b);
				s.addLoadedResource(c);

				var occupied = s.getOccupiedFilenames();
				occupied.should.be.instanceOf(Array);
				occupied.should.containEql('first.html');
				occupied.should.containEql('second.html');
				occupied.should.containEql('third.html');
				done();
			}).catch(done);
		});

		it('should contain all subdirectories names', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: [
					{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
					{ directory: 'js', extensions: ['.js'] },
					{ directory: 'css', extensions: ['.css'] }
				]
			});

			s.prepare().then(function() {
				var occupied = s.getOccupiedFilenames();
				occupied.should.be.instanceOf(Array);
				occupied.should.containEql('img');
				occupied.should.containEql('js');
				occupied.should.containEql('css');
				done();
			}).catch(done);
		});
	});

	describe('#getDirectoryByExtension', function() {
		it('should return correct subdirectory', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: [
					{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
					{ directory: 'js', extensions: ['.js'] }
				]
			});

			s.prepare().then(function() {
				s.getDirectoryByExtension('.jpg').should.be.eql('img');
				s.getDirectoryByExtension('.png').should.be.eql('img');
				s.getDirectoryByExtension('.svg').should.be.eql('img');
				s.getDirectoryByExtension('.js').should.be.eql('js');
				done();
			}).catch(done);
		});

		it('should return empty string if no subdirectory was found', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: [
					{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
					{ directory: 'js', extensions: ['.js'] }
				]
			});

			s.prepare().then(function() {
				s.getDirectoryByExtension('.gif').should.be.eql('');
				s.getDirectoryByExtension('.html').should.be.eql('');
				s.getDirectoryByExtension('.css').should.be.eql('');
				done();
			}).catch(done);
		});
	});

	describe('#generateFilename', function() {
		it('should return resource filename', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: null
			});

			s.prepare().then(function() {
				var r = new Resource('http://example.com/a.png', 'b.png');
				var filename = s.generateFilename(r);
				filename.should.be.eql('b.png');
				done();
			}).catch(done);
		});

		it('should return url-based filename if resource has no filename', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: null
			});

			s.prepare().then(function() {
				var r = new Resource('http://example.com/a.png', '');
				var filename = s.generateFilename(r);
				filename.should.be.eql('a.png');
				done();
			}).catch(done);
		});

		it('should return filename with correct subdirectory', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: [
					{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] }
				]
			});

			s.prepare().then(function() {
				var r = new Resource('http://example.com/a.png');
				var filename = s.generateFilename(r);
				filename.should.be.eql('img/a.png');
				done();
			}).catch(done);
		});

		it('should return different filename if desired filename is occupied', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: null
			});

			s.prepare().then(function() {
				var r1 = new Resource('http://first-example.com/a.png');
				var r2 = new Resource('http://second-example.com/a.png');

				var f1 = s.generateFilename(r1);
				f1.should.be.eql('a.png');
				r1.setFilename(f1);
				s.addLoadedResource(r1);

				var f2 = s.generateFilename(r2);
				f2.should.be.not.eql('a.png');

				done();
			}).catch(done);
		});

		it('should return different filename if desired filename is occupied N times', function(done) {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				subdirectories: null
			});

			s.prepare().then(function() {
				var r1 = new Resource('http://first-example.com/a.png');
				var r2 = new Resource('http://second-example.com/a.png');
				var r3 = new Resource('http://third-example.com/a.png');
				var r4 = new Resource('http://fourth-example.com/a.png');

				var f1 = s.generateFilename(r1);
				f1.should.be.eql('a.png');
				r1.setFilename(f1);
				s.addLoadedResource(r1);

				var f2 = s.generateFilename(r2);
				f2.should.be.not.eql(r1.getFilename());
				r2.setFilename(f2);
				s.addLoadedResource(r2);

				var f3 = s.generateFilename(r3);
				f3.should.be.not.eql(r1.getFilename());
				f3.should.be.not.eql(r2.getFilename());
				r3.setFilename(f3);
				s.addLoadedResource(r3);

				var f4 = s.generateFilename(r4);
				f4.should.be.not.eql(r1.getFilename());
				f4.should.be.not.eql(r2.getFilename());
				f4.should.be.not.eql(r3.getFilename());

				done();
			}).catch(done);
		});
	});

	describe('#loadResource', function() {
		it('should load resource', function(done) {
			nock('http://example.com').get('/a.png').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				var r = new Resource('http://example.com/a.png');
				s.loadResource(r).then(function(lr) {
					lr.should.be.eql(r);
					lr.getUrl().should.be.eql('http://example.com/a.png');
					lr.getFilename().should.be.not.empty();
					lr.getText().should.be.eql('OK');

					var text = fs.readFileSync(path.join(testDirname, lr.getFilename())).toString();
					text.should.be.eql(lr.getText());
					done();
				});
			}).catch(done);
		});

		it('should not load the same resource twice (should return already loaded)', function(done) {
			nock('http://example.com').get('/a.png').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.prepare().then(function() {
				var r1 = new Resource('http://example.com/a.png');
				var r2 = new Resource('http://example.com/a.png');
				s.loadResource(r1).then(function() {
					s.loadResource(r2).then(function(lr) {
						lr.should.be.equal(r1);
						lr.should.not.be.equal(r2);
					});
					done();
				});
			}).catch(done);
		});
	});

	describe('#scrape', function() {
		it('should call methods in sequence', function(done) {
			nock('http://example.com').get('/').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var validateSpy = sinon.spy(s, 'validate');
			var prepareSpy = sinon.spy(s, 'prepare');
			var loadSpy = sinon.spy(s, 'load');

			s.scrape().then(function() {
				validateSpy.calledOnce.should.be.eql(true);
				prepareSpy.calledOnce.should.be.eql(true);
				prepareSpy.calledAfter(validateSpy).should.be.eql(true);
				loadSpy.calledOnce.should.be.eql(true);
				loadSpy.calledAfter(prepareSpy).should.be.eql(true);
				done();
			}).catch(done);
		});

		it('should call errorCleanup on error', function(done) {
			nock('http://example.com').get('/').reply(200, 'OK');

			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var loadStub = sinon.stub(s, 'load');
			loadStub.throws('Error');

			var errorCleanupSpy = sinon.spy(s, 'errorCleanup');

			s.scrape().then(function() {
				done(new Error('Promise should not be resolved'));
			}).catch(function() {
				errorCleanupSpy.calledOnce.should.be.eql(true);
				done();
			});
		});
	});
});