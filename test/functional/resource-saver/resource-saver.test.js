const should = require('should');
const nock = require('nock');
const fs = require('fs-extra');
const sinon = require('sinon');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';

describe('Functional resourceSaver', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should use passed resourceSaver when saving resource', function() {
		nock('http://example.com/').get('/').reply(200, 'OK');

		class MyResourceSaver {
			saveResource() {}
			errorCleanup() {}
		}

		const saveResourceStub = sinon.stub(MyResourceSaver.prototype, 'saveResource').resolves();

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			resourceSaver: MyResourceSaver
		};

		return scrape(options).catch(function() {
			should(saveResourceStub.calledOnce).be.eql(true);
			should(saveResourceStub.args[0][0].url).be.eql('http://example.com/');
		});
	});

	it('should use passed resourceSaver on error', function() {
		nock('http://example.com/').get('/').replyWithError('SCRAPER AWFUL ERROR');

		class MyResourceSaver {
			saveResource() {}
			errorCleanup() {}
		}

		const removeResourcesStub = sinon.stub(MyResourceSaver.prototype, 'errorCleanup').resolves();

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			resourceSaver: MyResourceSaver,
			ignoreErrors: false
		};

		return scrape(options).catch(function() {
			should(removeResourcesStub.calledOnce).be.eql(true);
			should(removeResourcesStub.args[0][0].message).be.eql('SCRAPER AWFUL ERROR');
		});
	});

});
