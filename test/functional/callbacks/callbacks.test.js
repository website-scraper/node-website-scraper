import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import sinon from 'sinon';
import scrape from 'website-scraper';

const testDirname = './test/functional/callbacks/.tmp';

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

	it('should call onResourceSaved callback and onResourceError callback if ignoreErrors = true', function() {
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
			ignoreErrors: true,
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

	it('should call onResourceError callback if ignoreErrors = false', function() {
		// it is not necessary that 1st (successful) resource will be saved before error occurred, so skip onResourceSaved check
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
			ignoreErrors: true,
			plugins: [
				new MyPlugin()
			]
		};

		return scrape(options).then(function() {
			should(true).eql(false);
		}).catch(() => {
			should(resourceErrorStub.calledOnce).be.eql(true);
			should(resourceErrorStub.args[0][0].resource.url).be.eql('http://nodejs.org/');
			should(resourceErrorStub.args[0][0].error.message).be.eql('REQUEST ERROR!!');
		});
	});
});
