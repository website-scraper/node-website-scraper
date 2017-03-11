'use strict';

var should = require('should');
var sinon = require('sinon');
require('sinon-as-promised');
var nock = require('nock');
var proxyquire = require('proxyquire').noCallThru();
var fs = require('fs-extra');
var path = require('path');
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

		it('should return array of objects with url, filename and children', function() {
			nock('http://first-url.com').get('/').reply(200, 'OK');
			nock('http://second-url.com').get('/').reply(500);

			var s = new Scraper({
				urls: [
					'http://first-url.com',
					'http://second-url.com'
				],
				directory: testDirname
			});

			return s.load().then(function(res) {
				res.should.be.instanceOf(Array);
				res.should.have.length(2);
				res[0].should.be.instanceOf(Resource).and.have.properties(['url', 'filename', 'children']);
				res[1].should.be.instanceOf(Resource).and.have.properties(['url', 'filename', 'children']);
			});
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

	describe('#loadResource', function() {
		it('should add different resource to the map', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var r1 = new Resource('http://example.com/a1.png', 'a1.png');
			var r2 = new Resource('http://example.com/a2.png', 'a2.png');
			var r3 = new Resource('http://example.com/a3.png', 'a3.png');

			s.loadResource(r1);
			s.loadResource(r2);
			s.loadResource(r3);
			s.loadedResources.size.should.be.eql(3);
		});

		it('should not add the same resource twice', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var r = new Resource('http://example.com/a.png', 'a.png');

			s.loadResource(r);
			s.loadResource(r);
			s.loadedResources.size.should.be.eql(1);
		});
	});

	describe('#saveResource', function() {
		it('should save resource to FS', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			var r = new Resource('http://example.com/a.png', 'a.png');
			r.setText('some text');

			s.resourceHandler.handleResource = sinon.stub().resolves(r);

			return s.saveResource(r).then(function() {
				var text = fs.readFileSync(path.join(testDirname, r.getFilename())).toString();
				text.should.be.eql(r.getText());
			});
		});

		it('should call handleError on error', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			var dummyError = new Error('resource handler error');
			s.resourceHandler.handleResource = sinon.stub().rejects(dummyError);

			sinon.stub(s, 'handleError').resolves();

			var r = new Resource('http://example.com/a.png', 'a.png');
			r.setText('some text');

			return s.saveResource(r).finally(function() {
				s.handleError.calledOnce.should.be.eql(true);
				s.handleError.calledWith(dummyError).should.be.eql(true);
			});
		});
	});

	describe('#requestResource', function() {

		describe('url filtering', function() {
			it('should request the resource if the urlFilter returns true', function(){
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				var s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					urlFilter: function() { return true; }
				});

				var r = new Resource('http://example.com/a.png');
				return s.requestResource(r).then(function(rr) {
					rr.should.be.eql(r);
					rr.getUrl().should.be.eql('http://example.com/a.png');
					rr.getFilename().should.be.not.empty();
					rr.getText().should.be.eql('OK');
				});
			});

			it('should return promise resolved with null if the urlFilter returns false', function(){
				var s = new Scraper({
					urls: ['http://google.com'],
					directory: testDirname,
					urlFilter: function(){ return false; }
				});

				var r = new Resource('http://google.com/a.png');
				return s.requestResource(r).then(function(rr) {
					should.equal(rr, null);
				});
			});
		});

		describe('depth filtering', function() {
			it('should request the resource if the maxDepth option is not set', function(){
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				var s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname
				});

				var r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(212);
				return s.requestResource(r).then(function(rr) {
					rr.should.be.eql(r);
					rr.getUrl().should.be.eql('http://example.com/a.png');
					rr.getFilename().should.be.not.empty();
					rr.getText().should.be.eql('OK');
				});
			});

			it('should request the resource if maxDepth is set and resource depth is less than maxDept', function(){
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				var s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					maxDepth: 3
				});

				var r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(2);
				return s.requestResource(r).then(function(rr) {
					rr.should.be.eql(r);
					rr.getUrl().should.be.eql('http://example.com/a.png');
					rr.getFilename().should.be.not.empty();
					rr.getText().should.be.eql('OK');
				});
			});

			it('should request the resource if maxDepth is set and resource depth is equal to maxDept', function(){
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				var s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					maxDepth: 3
				});

				var r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(3);
				return s.requestResource(r).then(function(rr) {
					rr.should.be.eql(r);
					rr.getUrl().should.be.eql('http://example.com/a.png');
					rr.getFilename().should.be.not.empty();
					rr.getText().should.be.eql('OK');
				});
			});

			it('should return null if maxDepth is set and resource depth is greater than maxDepth', function(){
				var s = new Scraper({
					urls: ['http://google.com'],
					directory: testDirname,
					maxDepth: 3
				});

				var r = new Resource('http://google.com/a.png');
				r.getDepth = sinon.stub().returns(4);
				return s.requestResource(r).then(function(rr) {
					should.equal(rr, null);
				});
			});
		});

		it('should call handleError on error', function() {
			var s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			nock('http://example.com').get('/a.png').replyWithError('err');
			sinon.stub(s, 'handleError').resolves();

			var r = new Resource('http://example.com/a.png');

			return s.requestResource(r).finally(function() {
				s.handleError.calledOnce.should.be.eql(true);
			});
		});

		it('should update resource data with data returned from request', () => {
			let metadata = {
				solarSystemPlanets: [ 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune' ]
			};

			let s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			s.request.get = sinon.stub().resolves({
				url: 'http://google.com',
				body: 'test body',
				mimeType: 'text/html',
				metadata: metadata
			});

			let r = new Resource('http://example.com');

			return s.requestResource(r).finally(function() {
				r.getText().should.be.eql('test body');
				r.getUrl().should.be.eql('http://google.com');
				r.getType().should.be.eql('html');
				r.metadata.should.be.eql(metadata);
			});
		})
	});

	describe('#handleError', function() {
		it('should ignore error and return resolved promise if ignoreErrors option is true', function() {
			var s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname,
				ignoreErrors: true
			});
			return s.handleError(new Error('Request failed!')).then(function() {
				should(true).be.eql(true);
			});
		});

		it('should return rejected promise if ignoreErrors option is false', function() {
			var s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname,
				ignoreErrors: false
			});
			return s.handleError(new Error('Request failed!')).then(function() {
				should(false).be.eql(true);
			}).catch(function() {
				should(true).be.eql(true);
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

	describe('defaults', function() {
		it('should export defaults', function() {
			var defaultsMock = { subdirectories: null, recursive: true, sources: [] };
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
			should(Scraper.defaults).be.eql({ subdirectories: null, recursive: true, sources: [] });
		});
	});
});
