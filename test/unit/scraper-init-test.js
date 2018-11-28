const should = require('should');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const Scraper = require('../../lib/scraper');
const Resource = require('../../lib/resource');

const testDirname = __dirname + '/.scraper-init-test';
const urls = [ 'http://example.com' ];

function createConfigMock (params) {
	return Object.assign({requestConcurrency: Infinity}, params);
}

describe('Scraper initialization', function () {
	describe('defaultFilename', function() {
		let Scraper;

		before(function() {
			const defaultsMock = createConfigMock({ defaultFilename: 'dummyFilename.txt' });
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default defaultFilename if no defaultFilename were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.defaultFilename.should.equalFileSystemPath('dummyFilename.txt');
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
		let Scraper;

		before(function() {
			const defaultsMock = createConfigMock({ sources: ['1', '2', '3'] });
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default sources if no sources were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.sources.should.eql(['1', '2', '3']);
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
		let Scraper;

		before(function() {
			const defaultsMock = createConfigMock({ subdirectories: [{ directory: 'dir', extensions: ['.txt'] }] });
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default subdirectories if no subdirectories were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.subdirectories.should.eql([{ directory: 'dir', extensions: ['.txt'] }]);
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
		let Scraper;

		before(function() {
			const defaultsMock = createConfigMock({ request: { a: 1, b: 2 } });
			Scraper = proxyquire('../../lib/scraper', {
				'./config/defaults': defaultsMock
			});
		});

		it('should use default request if no request were passed', function () {
			const s = new Scraper({
				urls: urls,
				directory: testDirname
			});

			s.options.request.should.eql({ a: 1, b: 2 });
		});

		it('should merge default and passed objects if request were passed', function () {
			const s = new Scraper({
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
			const s = new Scraper({
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
			const ResourceHandlerStub = sinon.stub();
			const Scraper = proxyquire('../../lib/scraper', {
				'./resource-handler': ResourceHandlerStub
			});

			const options = {
				urls: { url: 'http://first-url.com' },
				directory: testDirname,
				maxDepth: 100
			};

			const s = new Scraper(options);
			ResourceHandlerStub.calledOnce.should.be.eql(true);
			ResourceHandlerStub.args[0][0].should.be.eql(s.options);
			ResourceHandlerStub.args[0][1].should.have.property('requestResource');
			ResourceHandlerStub.args[0][1].should.have.property('getReference');
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
				const s = new Scraper({
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
		})
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
	})
});