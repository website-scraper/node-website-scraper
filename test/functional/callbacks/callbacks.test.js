const should = require('should');
const nock = require('nock');
const fs = require('fs-extra');
const sinon = require('sinon');
const scrape = require('../../../index');

const testDirname = __dirname + '/.tmp';
const mockDirname = __dirname + '/mocks';

describe('Functional callbacks', () => {

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

		const options = {
			urls: [ 'http://example.com/', 'http://nodejs.org/' ],
			directory: testDirname,
			subdirectories: null,
			onResourceSaved: resourceSavedStub,
			onResourceError: resourceErrorStub
		};

		return scrape(options).then(function() {
			should(resourceSavedStub.calledOnce).be.eql(true);
			should(resourceSavedStub.args[0][0].url).be.eql('http://example.com/');

			should(resourceErrorStub.calledOnce).be.eql(true);
			should(resourceErrorStub.args[0][0].url).be.eql('http://nodejs.org/');
			should(resourceErrorStub.args[0][1].message).be.eql('REQUEST ERROR!!');
		});
	});
});
