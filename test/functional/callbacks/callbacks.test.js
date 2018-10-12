const should = require('should');
const nock = require('nock');
const fs = require('fs-extra');
const sinon = require('sinon');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';
const mockDirname = __dirname + '/mocks';

describe('Functional: onResourceSaved and onResourceError callbacks in plugin', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should call onResourceSaved callback and onResourceError callback', function() {
		nock('http://example.com/').get('/').reply(200, 'OK');
		nock('http://nodejs.org/').get('/').replyWithError('REQUEST ERROR!!');

		const resourceSavedStub = sinon.stub();
		const resourceErrorStub = sinon.stub();

		class MyPlugin {
			apply(addAction) {
				addAction('onResourceSaved', resourceSavedStub);
				addAction('onResourceError', resourceErrorStub);
			}
		}

		const options = {
			urls: [ 'http://example.com/', 'http://nodejs.org/' ],
			directory: testDirname,
			subdirectories: null,
			plugins: [
				new MyPlugin()
			]
		};

		return scrape(options).then(function() {
			should(resourceSavedStub.calledOnce).be.eql(true);
			should(resourceSavedStub.args[0][0].resource.url).be.eql('http://example.com/');

			should(resourceErrorStub.calledOnce).be.eql(true);
			should(resourceErrorStub.args[0][0].resource.url).be.eql('http://nodejs.org/');
			should(resourceErrorStub.args[0][0].error.message).be.eql('REQUEST ERROR!!');
		});
	});
});
