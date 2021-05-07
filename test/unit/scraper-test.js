import should from 'should';
import sinon from 'sinon';
import nock from 'nock';
import fs from 'fs-extra';
import path from 'path';
import Scraper from '../../lib/scraper.js';
import Resource from '../../lib/resource.js';

import defaultOptions from 'website-scraper/defaultOptions';
import * as plugins from 'website-scraper/plugins';

const testDirname = './test/unit/.scraper-test';

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

	describe('#errorCleanup', function() {
		it('should throw error', function() {
			const s = new Scraper({
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
	});

	describe('#loadResource', function() {
		it('should add different resource to the map', function() {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			const r1 = new Resource('http://example.com/a1.png', 'a1.png');
			const r2 = new Resource('http://example.com/a2.png', 'a2.png');
			const r3 = new Resource('http://example.com/a3.png', 'a3.png');

			s.loadResource(r1);
			s.loadResource(r2);
			s.loadResource(r3);
			s.loadedResources.size.should.be.eql(3);
		});

		it('should not add the same resource twice', function() {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			const r = new Resource('http://example.com/a.png', 'a.png');

			s.loadResource(r);
			s.loadResource(r);
			s.loadedResources.size.should.be.eql(1);
		});
	});

	describe('#saveResource', function() {
		it('should call handleError on error', function() {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			const dummyError = new Error('resource handler error');
			s.resourceHandler.handleResource = sinon.stub().rejects(dummyError);

			sinon.stub(s, 'handleError').resolves();

			const r = new Resource('http://example.com/a.png', 'a.png');
			r.setText('some text');

			return s.saveResource(r).then(() => should(true).eql(false)).catch(function() {
				s.handleError.calledOnce.should.be.eql(true);
				s.handleError.calledWith(dummyError).should.be.eql(true);
			});
		});
	});

	describe('#requestResource', function() {

		class GenerateFilenamePlugin {
			apply(registerAction) {
				registerAction('generateFilename', sinon.stub().returns({ filename: 'generated-filename' }))
			}
		}

		describe('url filtering', function() {
			it('should request the resource if the urlFilter returns true', function(){
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					urlFilter: function() { return true; },
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
				return s.requestResource(r).then(function(rr) {
					rr.should.be.eql(r);
					rr.getUrl().should.be.eql('http://example.com/a.png');
					rr.getFilename().should.be.not.empty();
					rr.getText().should.be.eql('OK');
				});
			});

			it('should return promise resolved with null if the urlFilter returns false', function(){
				const s = new Scraper({
					urls: ['http://google.com'],
					directory: testDirname,
					urlFilter: function(){ return false; }
				});

				const r = new Resource('http://google.com/a.png');
				return s.requestResource(r).then(function(rr) {
					should.equal(rr, null);
				});
			});
		});

		describe('depth filtering', function() {
			it('should request the resource if the maxDepth option is not set', function(){
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
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

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					maxDepth: 3,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
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

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					maxDepth: 3,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(3);
				return s.requestResource(r).then(function(rr) {
					rr.should.be.eql(r);
					rr.getUrl().should.be.eql('http://example.com/a.png');
					rr.getFilename().should.be.not.empty();
					rr.getText().should.be.eql('OK');
				});
			});

			it('should return null if maxDepth is set and resource depth is greater than maxDepth', function(){
				const s = new Scraper({
					urls: ['http://google.com'],
					directory: testDirname,
					maxDepth: 3
				});

				const r = new Resource('http://google.com/a.png');
				r.getDepth = sinon.stub().returns(4);
				return s.requestResource(r).then(function(rr) {
					should.equal(rr, null);
				});
			});
		});

		it('should call handleError on error', function() {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			nock('http://example.com').get('/a.png').replyWithError('err');
			sinon.stub(s, 'handleError').resolves();

			const r = new Resource('http://example.com/a.png');

			return s.requestResource(r).then(() => should(true).eql(false)).catch(function() {
				s.handleError.calledOnce.should.be.eql(true);
			});
		});

		it('should update resource data with data returned from request', () => {
			const metadata = {
				solarSystemPlanets: [ 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune' ]
			};

			class GenerateFilenamePlugin {
				apply(registerAction) {
					registerAction('generateFilename', sinon.stub().returns({ filename: 'generated-filename' }));
				}
			}

			class AddMetadataPlugin {
				apply(registerAction) {
					registerAction('afterResponse', sinon.stub().returns({body: 'test body', metadata}));
				}
			}

			nock('http://example.com').get('/').reply(200, 'test body', {
				'content-type': 'text/html; charset=utf-8'
			});

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				plugins: [ new GenerateFilenamePlugin(), new AddMetadataPlugin() ]
			});

			const r = new Resource('http://example.com');

			return s.requestResource(r).then(function() {
				should(r.getText()).be.eql('test body');
				should(r.getUrl()).be.eql('http://example.com');
				should(r.getType()).be.eql('html');
				should(r.getFilename()).be.eql('generated-filename');
				should(r.metadata).be.eql(metadata);
			});
		})
	});

	describe('#handleError', function() {
		it('should ignore error and return resolved promise if ignoreErrors option is true', function() {
			const s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname,
				ignoreErrors: true
			});
			return s.handleError(new Error('Request failed!')).then(function() {
				should(true).be.eql(true);
			});
		});

		it('should return rejected promise if ignoreErrors option is false', function() {
			const s = new Scraper({
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
		it('should call load', function() {
			nock('http://example.com').get('/').reply(200, 'OK');

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			const loadSpy = sinon.spy(s, 'load');

			return s.scrape().then(function() {
				loadSpy.calledOnce.should.be.eql(true);
			});
		});

		it('should call errorCleanup on error', function() {
			nock('http://example.com').get('/').reply(200, 'OK');

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			sinon.stub(s, 'load').rejects(new Error('Awful error'));

			const errorCleanupSpy = sinon.spy(s, 'errorCleanup');

			return s.scrape().then(function() {
				should(true).be.eql(false);
			}).catch(function(err) {
				errorCleanupSpy.calledOnce.should.be.eql(true);
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('Awful error');
			});
		});

		it('should return array of objects with url, filename and children', function() {
			nock('http://first-url.com').get('/').reply(200, 'OK');
			nock('http://second-url.com').get('/').reply(500);

			const s = new Scraper({
				urls: [
					'http://first-url.com',
					'http://second-url.com'
				],
				directory: testDirname
			});

			return s.scrape().then(function(res) {
				res.should.be.instanceOf(Array);
				res.should.have.length(2);
				res[0].should.be.instanceOf(Resource).and.have.properties(['url', 'filename', 'children']);
				res[1].should.be.instanceOf(Resource).and.have.properties(['url', 'filename', 'children']);
			});
		});
	});

	describe('#runActions', () => {
		it('should run all actions with correct params and save result from last', async () => {
			const s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname
			});

			const beforeStartActionStub1 = sinon.stub().resolves({result: 1});
			const beforeStartActionStub2 = sinon.stub().resolves({result: 2});
			const beforeStartActionStub3 = sinon.stub().resolves({result: 3});

			s.addAction('beforeStart', beforeStartActionStub1);
			s.addAction('beforeStart', beforeStartActionStub2);
			s.addAction('beforeStart', beforeStartActionStub3);

			const result = await s.runActions('beforeStart', {options: s.options});

			should(beforeStartActionStub1.callCount).eql(1);
			should(beforeStartActionStub1.args[0][0]).be.eql({options: s.options});

			should(beforeStartActionStub2.callCount).eql(1);
			should(beforeStartActionStub2.args[0][0]).be.eql({options: s.options, result: 1});

			should(beforeStartActionStub3.callCount).eql(1);
			should(beforeStartActionStub3.args[0][0]).be.eql({options: s.options, result: 2});

			should(result).eql({result: 3});
		});

		it('should fail if one of actions fails', async () => {
			const s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname
			});

			const beforeStartActionStub1 = sinon.stub().resolves({result: 1});
			const beforeStartActionStub2 = sinon.stub().rejects(new Error('Error from beforeStart 2'));
			const beforeStartActionStub3 = sinon.stub().resolves({result: 3});

			s.addAction('beforeStart', beforeStartActionStub1);
			s.addAction('beforeStart', beforeStartActionStub2);
			s.addAction('beforeStart', beforeStartActionStub3);

			try {
				await s.runActions('beforeStart', {options: s.options});
				should(false).eql(true);
			} catch (err) {
				should(beforeStartActionStub1.callCount).eql(1);
				should(beforeStartActionStub1.args[0][0]).be.eql({options: s.options});

				should(beforeStartActionStub2.callCount).eql(1);
				should(beforeStartActionStub2.args[0][0]).be.eql({options: s.options, result: 1});

				should(beforeStartActionStub3.callCount).eql(0);

				should(err.message).eql('Error from beforeStart 2');
			}
		});

		it('should return passed params as result if no actions to run', async () => {
			const s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname
			});

			const result = await s.runActions('beforeRequest', {requestOptions: {a: 1}});

			should(result).eql({requestOptions: {a: 1}});
		});
	});

	describe('export defaults', function() {
		it('should export defaults', function() {
			should(defaultOptions).be.have.properties([
				'subdirectories', 'sources', 'defaultFilename', 'prettifyUrls',
				'request', 'requestConcurrency', 'ignoreErrors', 'urlFilter',
				'maxDepth', 'maxRecursiveDepth'
			]);
		});
	});

	describe('export plugins', function() {
		it('should export default plugins', function() {
			should(plugins.SaveResourceToFileSystemPlugin).be.instanceOf(Function);
			should(plugins.GenerateFilenameByTypePlugin).be.instanceOf(Function);
			should(plugins.GenerateFilenameBySiteStructurePlugin).be.instanceOf(Function);
		});
	});

	describe('default saveResource plugin', () => {
		it('should create directory on scrape', async () => {
			nock('http://example.com').get('/').reply(200, 'OK');
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			await s.scrape();

			should(fs.existsSync(testDirname)).be.eql(true);
		});

		it('should save resource to FS', async () => {
			nock('http://example.com').get('/').reply(200, 'some text');
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			await s.scrape();

			const filename = path.join(testDirname, 'index.html');
			should(fs.existsSync(filename)).be.eql(true);
			should(fs.readFileSync(filename).toString()).be.eql('some text');
		});

		it('should remove directory on error occurs if something was loaded', async () => {
			nock('http://example.com').get('/').reply(200, 'OK');
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			fs.existsSync(testDirname).should.be.eql(false);

			await s.scrape();

			fs.existsSync(testDirname).should.be.eql(true);

			try {
				await s.errorCleanup(new Error('everything was broken!'));
				should(true).be.eql(false);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).be.eql('everything was broken!');
				should(fs.existsSync(testDirname)).be.eql(false);
			}
		});

		it('should not remove directory if error occurs and nothing was loaded', async () => {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			fs.mkdirpSync(testDirname);
			fs.existsSync(testDirname).should.be.eql(true);

			try {
				await s.errorCleanup(new Error('everything was broken!'));
				should(true).be.eql(false);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).be.eql('everything was broken!');
				should(fs.existsSync(testDirname)).be.eql(true);
			}
		});

		it('should return error if no directory', async () => {
			try {
				const s = new Scraper({
					urls: 'http://example.com',
				});
				await s.scrape();
				should(false).eql(true);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).containEql('Incorrect directory');
			}
		});

		it('should return error if empty directory passed', async () => {
			try {
				const s = new Scraper({
					urls: 'http://example.com',
					directory: ''
				});
				await s.scrape();
				should(false).eql(true);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).containEql('Incorrect directory');
			}
		});

		it('should return error if incorrect directory passed', async () => {
			try {
				const s = new Scraper({
					urls: 'http://example.com',
					directory: {}
				});
				await s.scrape();
				should(false).eql(true);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).containEql('Incorrect directory');
			}
		});

		it('should return error if existing directory passed', async () => {
			try {
				fs.mkdirpSync(testDirname);
				const s = new Scraper({
					urls: 'http://example.com',
					directory: testDirname
				});
				await s.scrape();
				should(false).eql(true);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).match(/Directory (.*?) exists/);
			}
		});
	});

	describe('default generateFilename plugins', () => {
		it('should use byType plugin if filenameGenerator option is set', async () => {
			nock('http://example.com').get('/').reply(200, 'some text', {'content-type': 'text/html'});
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				filenameGenerator: 'byType'
			});

			await s.scrape();

			should(s.options.plugins[0]).be.instanceOf(plugins.GenerateFilenameByTypePlugin);

			const filename = path.join(testDirname, 'index.html');
			should(fs.existsSync(filename)).be.eql(true);
			should(fs.readFileSync(filename).toString()).be.eql('some text');
		});

		it('should use bySiteStructure plugin if filenameGenerator option is set', async () => {
			nock('http://example.com').get('/').reply(200, 'some text', {'content-type': 'text/html'});
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				filenameGenerator: 'bySiteStructure'
			});

			const a = await s.scrape();

			should(s.options.plugins[0]).be.instanceOf(plugins.GenerateFilenameBySiteStructurePlugin);

			const filename = path.join(testDirname, 'example.com/index.html');
			should(fs.existsSync(filename)).be.eql(true);
			should(fs.readFileSync(filename).toString()).be.eql('some text');
		});

		it('should ignore filenameGenerator option if function passed', async () => {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				filenameGenerator: () => {}
			});

			should(s.options.plugins.length).be.eql(0);
		});
	});
});
