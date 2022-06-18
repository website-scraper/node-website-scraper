import should from 'should';
import '../utils/assertions.js';
import Scraper from '../../lib/scraper.js';
import Resource from '../../lib/resource.js';

import defaultOptions from 'website-scraper/defaultOptions';

const testDirname = './test/unit/.scraper-init-test';
const urls = [ 'http://example.com' ];

describe('Scraper initialization', function () {
	describe('defaultFilename', function() {
		it('should use default defaultFilename if no defaultFilename were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.defaultFilename.should.equalFileSystemPath(defaultOptions.defaultFilename);
		});

		it('should use defaultFilename sources if defaultFilename were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				defaultFilename: 'myNewFileName.txt'
			});

			s.options.defaultFilename.should.equalFileSystemPath('myNewFileName.txt');
		});
	});

	describe('sources', function() {
		it('should use default sources if no sources were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.sources.should.eql(defaultOptions.sources);
			s.options.sources.length.should.be.greaterThan(0);
		});

		it('should use passed sources if sources were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				sources: [ { selector: 'img', attr: 'src' } ]
			});

			s.options.sources.should.eql([ { selector: 'img', attr: 'src' } ]);
		});

		it('should extend sources if recursive flag is set', function() {
			const s = new Scraper({
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
		it('should use default subdirectories if no subdirectories were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.subdirectories.should.eql(defaultOptions.subdirectories);
			s.options.subdirectories.length.should.be.greaterThan(0);
		});

		it('should convert extensions to lower case', function () {

			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				subdirectories: [
					{ directory: 'dir', extensions: ['.TXT'] }
				]
			});

			s.options.subdirectories[0].extensions.should.eql(['.txt']);
		});

		it('should use passed subdirectories if subdirectories were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				subdirectories: [ { directory: 'js', extensions: ['.js'] } ]
			});

			s.options.subdirectories.should.eql([ { directory: 'js', extensions: ['.js'] } ]);
		});

		it('should use null if null was passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				subdirectories: null
			});

			should(s.options.subdirectories).eql(null);
		});
	});

	describe('request', function () {
		it('should use default request if no request were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.request.should.containEql({
				throwHttpErrors: false,
				responseType: 'buffer',
				decompress: true,
				https: {
					rejectUnauthorized: false
				}
			});
		});

		it('should merge default and passed objects if request were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				request: {
					throwHttpErrors: true,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
					}
				}
			});

			s.options.request.should.eql({
				throwHttpErrors: true,
				responseType: 'buffer',
				decompress: true,
				https: {
					rejectUnauthorized: false
				},
				headers: {
					'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
				}
			});
		});

		it('should override existing properties if request were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname,
				request: {
					encoding: 'another encoding',
				}
			});

			s.options.request.should.containEql({
				encoding: 'another encoding',
				decompress: true,
				https: {
					rejectUnauthorized: false
				},
			});
		});
	});

	describe('resourceHandler', function () {
		it('should create resourceHandler with correct params', function() {
			const options = {
				urls: { url: 'http://first-url.com' },
				directory: testDirname,
				maxDepth: 100
			};

			const s = new Scraper(options);
			should(typeof s.resourceHandler.requestResource).be.eql('function');
			should(typeof s.resourceHandler.getReference).be.eql('function');
		});
	});

	describe('urls', function () {
		it('should create an Array of urls if string was passed', function() {
			const s = new Scraper({
				urls: 'http://not-array-url.com',
				directory: testDirname
			});

			s.options.urls.should.be.an.instanceOf(Array).and.have.length(1);
			s.options.urls[0].should.be.eql({url: 'http://not-array-url.com', filename: 'index.html'});
		});
	});

	describe('resources', function () {
		it('should create Resource object for each url', function() {
			const s = new Scraper({
				urls: [
					'http://first-url.com',
					{ url: 'http://second-url.com' },
					{ url: 'http://third-url.com' }
				],
				directory: testDirname
			});

			s.resources.should.be.an.instanceOf(Array).and.have.length(3);
			s.resources[0].should.be.an.instanceOf(Resource);
			s.resources[0].url.should.be.eql('http://first-url.com');
			s.resources[1].should.be.an.instanceOf(Resource);
			s.resources[1].url.should.be.eql('http://second-url.com');
			s.resources[2].should.be.an.instanceOf(Resource);
			s.resources[2].url.should.be.eql('http://third-url.com');
		});

		it('should use urls filename', function() {
			const s = new Scraper({
				urls: { url: 'http://first-url.com', filename: 'first.html' },
				directory: testDirname
			});
			s.resources[0].getFilename().should.equalFileSystemPath('first.html');
		});

		it('should use default filename if no url filename was provided', function() {
			const s = new Scraper({
				urls: { url: 'http://first-url.com' },
				defaultFilename: 'default.html',
				directory: testDirname
			});
			s.resources[0].getFilename().should.equalFileSystemPath('default.html');
		});
	});

	describe('actions', () => {
		it('should add empty actions when no plugins', () => {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.actions.beforeStart.length.should.be.eql(2);
			s.actions.afterFinish.length.should.be.eql(0);
			s.actions.error.length.should.be.eql(1);

			s.actions.beforeRequest.length.should.be.eql(0);
			s.actions.afterResponse.length.should.be.eql(0);
			s.actions.onResourceSaved.length.should.be.eql(0);
			s.actions.onResourceError.length.should.be.eql(0);

			s.actions.saveResource.length.should.be.eql(1);
			s.actions.generateFilename.length.should.be.eql(1);
		});

		it('should add actions when plugin set', () => {
			class MyPlugin {
				apply(addAction) {
					addAction('beforeStart', () => {});
					addAction('afterFinish', () => {});
				}
			}

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				plugins: [
					new MyPlugin()
				]
			});

			s.actions.beforeStart.length.should.be.eql(3);
			s.actions.afterFinish.length.should.be.eql(1);
			s.actions.error.length.should.be.eql(1);

			s.actions.beforeRequest.length.should.be.eql(0);
			s.actions.afterResponse.length.should.be.eql(0);
			s.actions.onResourceSaved.length.should.be.eql(0);
			s.actions.onResourceError.length.should.be.eql(0);

			s.actions.saveResource.length.should.be.eql(1);
			s.actions.generateFilename.length.should.be.eql(1);
		});

		it('should add actions when multiple plugins set', () => {
			class MyPlugin1 {
				apply(addAction) {
					addAction('beforeStart', () => {});
					addAction('afterFinish', () => {});
				}
			}

			class MyPlugin2 {
				apply(addAction) {
					addAction('beforeStart', () => {});
					addAction('beforeRequest', () => {});
					addAction('onResourceSaved', () => {});
				}
			}

			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname,
				plugins: [
					new MyPlugin1(),
					new MyPlugin2(),
				]
			});

			s.actions.beforeStart.length.should.be.eql(4);
			s.actions.afterFinish.length.should.be.eql(1);
			s.actions.error.length.should.be.eql(1);

			s.actions.beforeRequest.length.should.be.eql(1);
			s.actions.afterResponse.length.should.be.eql(0);

			s.actions.onResourceSaved.length.should.be.eql(1);
			s.actions.onResourceError.length.should.be.eql(0);

			s.actions.saveResource.length.should.be.eql(1);
			s.actions.generateFilename.length.should.be.eql(1);
		});

		it('should throw error if plugin has wrong action', () => {
			class MyPlugin {
				apply(addAction) {
					addAction('beforeStart', () => {});
					addAction('wrongAction', () => {});
				}
			}

			try {
				new Scraper({
					urls: 'http://example.com',
					directory: testDirname,
					plugins: [
						new MyPlugin()
					]
				});
				should(false).eql(true);
			} catch (err) {
				should(err).be.instanceOf(Error);
				should(err.message).be.eql('Unknown action "wrongAction"');
			}
		});
	});

	describe('mandatory actions', () => {
		it('should add mandatory actions - saveResource and generateFilename', () => {
			const s = new Scraper({
				urls: 'http://example.com',
				directory: testDirname
			});

			s.actions.saveResource.length.should.be.eql(1);
			s.actions.generateFilename.length.should.be.eql(1);
		});
	});
});
