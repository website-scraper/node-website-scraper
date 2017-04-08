'use strict';

const should = require('should');
const nock = require('nock');
const fs = require('fs-extra');
const sinon = require('sinon');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';

describe('Functional resourceStorage', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should use passed resourceStorage when saving resource', function() {
		nock('http://example.com/').get('/').reply(200, 'OK');

		class MyResourceStorage {
			saveResource() {}
			removeSavedResources() {}
		}

		const saveResourceStub = sinon.stub(MyResourceStorage.prototype, 'saveResource').resolves();

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			resourceStorage: MyResourceStorage
		};

		return scrape(options).catch(function() {
			should(saveResourceStub.calledOnce).be.eql(true);
			should(saveResourceStub.args[0][0].url).be.eql('http://example.com/');
		});
	});

	it('should use passed resourceStorage on error', function() {
		nock('http://example.com/').get('/').replyWithError('ERROR');

		class MyResourceStorage {
			saveResource() {}
			removeSavedResources() {}
		}

		const removeResourcesStub = sinon.stub(MyResourceStorage.prototype, 'removeSavedResources').resolves();

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			resourceStorage: MyResourceStorage,
			ignoreErrors: false
		};

		return scrape(options).catch(function() {
			should(removeResourcesStub.calledOnce).be.eql(true);
		});
	});

});
