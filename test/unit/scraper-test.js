import should from 'should';
import sinon from 'sinon';
import nock from 'nock';
import fs from 'fs-extra';
import path from 'path';
import Scraper from '../../lib/scraper.js';
import Resource from '../../lib/resource.js';
import * as plugins from '../../lib/plugins/index.js';

import defaultOptions from 'website-scraper/defaultOptions';


const testDirname = './test/unit/.scraper-test';

describe('Scraper', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	describe('#loadResource', () => {
		it('should add different resource to the map', () => {
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

		it('should not add the same resource twice', () => {
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

	describe('#saveResource', () => {
		it('should call handleError on error', () => {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});
			const dummyError = new Error('resource handler error');
			s.resourceHandler.handleResource = sinon.stub().rejects(dummyError);

			sinon.stub(s, 'handleError').resolves();

			const r = new Resource('http://example.com/a.png', 'a.png');
			r.setText('some text');

			return s.saveResource(r).then(() => should(true).eql(false)).catch(() => {
				s.handleError.calledOnce.should.be.eql(true);
				s.handleError.calledWith(dummyError).should.be.eql(true);
			});
		});
	});

	describe('#requestResource', () => {

		class GenerateFilenamePlugin {
			apply (registerAction) {
				registerAction('generateFilename', sinon.stub().returns({ filename: 'generated-filename' }));
			}
		}

		describe('url filtering', () => {
			it('should request the resource if the urlFilter returns true', async () =>{
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					urlFilter: () => { return true; },
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(2);

				const rr = await s.requestResource(r);

				rr.should.be.eql(r);
				rr.getUrl().should.be.eql('http://example.com/a.png');
				rr.getFilename().should.be.not.empty();
				rr.getText().should.be.not.empty();
			});

			it('should return null if the urlFilter returns false', async () =>{
				const s = new Scraper({
					urls: ['http://google.com'],
					directory: testDirname,
					urlFilter: () =>{ return false; }
				});

				const r = new Resource('http://google.com/a.png');
				r.getDepth = sinon.stub().returns(2);

				const rr = await s.requestResource(r);
				should.equal(rr, null);
			});

			it('should ignore urlFilter if resource depth=0', async () => {
				nock('http://example.com').get('/').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					urlFilter: () => false,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com');
				r.getDepth = sinon.stub().returns(0);

				const rr = await s.requestResource(r);

				rr.should.be.eql(r);
				rr.getUrl().should.be.eql('http://example.com');
				rr.getFilename().should.be.not.empty();
				rr.getText().should.be.not.empty();
			});
		});

		describe('depth filtering', () => {
			it('should request the resource if the maxDepth option is not set', async () =>{
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(212);

				const rr = await s.requestResource(r);

				rr.should.be.eql(r);
				rr.getUrl().should.be.eql('http://example.com/a.png');
				rr.getFilename().should.be.not.empty();
				rr.getText().should.be.not.empty();
			});

			it('should request the resource if maxDepth is set and resource depth is less than maxDept', async () =>{
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					maxDepth: 3,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(2);

				const rr = await s.requestResource(r);

				rr.should.be.eql(r);
				rr.getUrl().should.be.eql('http://example.com/a.png');
				rr.getFilename().should.be.not.empty();
				rr.getText().should.be.not.empty();
			});

			it('should request the resource if maxDepth is set and resource depth is equal to maxDept', async () =>{
				nock('http://example.com').get('/a.png').reply(200, 'OK');

				const s = new Scraper({
					urls: ['http://example.com'],
					directory: testDirname,
					maxDepth: 3,
					plugins: [ new GenerateFilenamePlugin() ]
				});

				const r = new Resource('http://example.com/a.png');
				r.getDepth = sinon.stub().returns(3);

				const rr = await s.requestResource(r);
				rr.should.be.eql(r);
				rr.getUrl().should.be.eql('http://example.com/a.png');
				rr.getFilename().should.be.not.empty();
				rr.getText().should.be.not.empty();
			});

			it('should return null if maxDepth is set and resource depth is greater than maxDepth', async () =>{
				const s = new Scraper({
					urls: ['http://google.com'],
					directory: testDirname,
					maxDepth: 3
				});

				const r = new Resource('http://google.com/a.png');
				r.getDepth = sinon.stub().returns(4);

				const rr = await s.requestResource(r);
				should.equal(rr, null);
			});
		});

		it('should call handleError on error', async () => {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				ignoreErrors: false
			});
			nock('http://example.com').get('/a.png').replyWithError('err');
			sinon.stub(s, 'handleError').resolves();

			const r = new Resource('http://example.com/a.png');

			try {
				await s.requestResource(r);
				should(true).eql(false);
			} catch (err) {
				s.handleError.calledOnce.should.be.eql(true);
			}
		});

		it('should update resource data with data returned from request', async () => {
			const metadata = {
				solarSystemPlanets: [ 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune' ]
			};

			class GenerateFilenamePlugin {
				apply (registerAction) {
					registerAction('generateFilename', sinon.stub().returns({ filename: 'generated-filename' }));
				}
			}

			class AddMetadataPlugin {
				apply (registerAction) {
					registerAction('afterResponse', sinon.stub().returns({body: 'test body', metadata, encoding: 'utf8'}));
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
			await s.requestResource(r);

			should(r.getText()).be.eql('test body');
			should(r.getUrl()).be.eql('http://example.com');
			should(r.getType()).be.eql('html');
			should(r.getFilename()).be.eql('generated-filename');
			should(r.getEncoding()).be.eql('utf8');
			should(r.metadata).be.eql(metadata);
		});
	});

	describe('#handleError', () => {
		it('should ignore error and return resolved promise if ignoreErrors option is true', () => {
			const s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname,
				ignoreErrors: true
			});
			return s.handleError(new Error('Request failed!')).then(() => {
				should(true).be.eql(true);
			});
		});

		it('should return rejected promise if ignoreErrors option is false', () => {
			const s = new Scraper({
				urls: ['http://example.com'],
				directory: testDirname,
				ignoreErrors: false
			});
			return s.handleError(new Error('Request failed!')).then(() => {
				should(false).be.eql(true);
			}).catch(() => {
				should(true).be.eql(true);
			});
		});
	});

	describe('#scrape', () => {
		it('should call load', () => {
			nock('http://example.com').get('/').reply(200, 'OK');

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			const loadSpy = sinon.spy(s, 'load');

			return s.scrape().then(() => {
				loadSpy.calledOnce.should.be.eql(true);
			});
		});

		it('should call errorCleanup on error', () => {
			nock('http://example.com').get('/').reply(200, 'OK');

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			sinon.stub(s, 'load').rejects(new Error('Awful error'));

			return s.scrape().then(() => {
				should(true).be.eql(false);
			}).catch((err) => {
				err.should.be.instanceOf(Error);
				err.message.should.be.eql('Awful error');
			});
		});

		it('should return array of objects with url, filename and children', () => {
			nock('http://first-url.com').get('/').reply(200, 'OK');
			nock('http://second-url.com').get('/').reply(404, 'NOT OK');

			const s = new Scraper({
				urls: [
					'http://first-url.com',
					'http://second-url.com'
				],
				directory: testDirname
			});

			return s.scrape().then((res) => {
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

	describe('export defaults', () => {
		it('should export defaults', () => {
			should(defaultOptions).be.have.properties([
				'subdirectories', 'sources', 'defaultFilename', 'prettifyUrls',
				'request', 'requestConcurrency', 'ignoreErrors', 'urlFilter',
				'maxDepth', 'maxRecursiveDepth'
			]);
		});
	});

	describe('export plugins', () => {
		it('should export default plugins', () => {
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
			nock('http://example.com').get('/').reply(200, '<html><head></head><body>some text</body></html>');
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			await s.scrape();

			const filename = path.join(testDirname, 'index.html');
			should(fs.existsSync(filename)).be.eql(true);
			should(fs.readFileSync(filename).toString()).be.eql('<html><head></head><body>some text</body></html>');
		});

		it('should remove directory on error', async () => {
			nock('http://example.com').get('/').reply(400);
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				request: {
					throwHttpErrors: true
				},
				ignoreErrors: false
			});

			try {
				await s.scrape();
				should(true).be.eql(false);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).be.eql('Response code 400 (Bad Request)');
				should(fs.existsSync(testDirname)).be.eql(false);
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
			nock('http://example.com').get('/').reply(200,
				'<html><head></head><body>some text</body></html>',
				{'content-type': 'text/html'}
			);
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				filenameGenerator: 'byType'
			});

			await s.scrape();

			should(s.options.plugins[0]).be.instanceOf(plugins.GenerateFilenameByTypePlugin);

			const filename = path.join(testDirname, 'index.html');
			should(fs.existsSync(filename)).be.eql(true);
			should(fs.readFileSync(filename).toString()).be.eql('<html><head></head><body>some text</body></html>');
		});

		it('should use bySiteStructure plugin if filenameGenerator option is set', async () => {
			nock('http://example.com').get('/').reply(200, '<html><head></head><body>some text</body></html>', {'content-type': 'text/html'});
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				filenameGenerator: 'bySiteStructure'
			});

			await s.scrape();

			should(s.options.plugins[0]).be.instanceOf(plugins.GenerateFilenameBySiteStructurePlugin);

			const filename = path.join(testDirname, 'example.com/index.html');
			should(fs.existsSync(filename)).be.eql(true);
			should(fs.readFileSync(filename).toString()).be.eql('<html><head></head><body>some text</body></html>');
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
