var should = require('should');
var sinon = require('sinon');
require('sinon-as-promised');
var nock = require('nock');
var proxyquire = require('proxyquire');
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