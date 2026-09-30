import * as chai from 'chai';
chai.should();

import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs';
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
		fs.rmSync(testDirname, {recursive: true, force: true});
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
			resourceSavedStub.calledOnce.should.be.eql(true);
			resourceSavedStub.args[0][0].resource.url.should.be.eql('http://example.com/');

			resourceErrorStub.calledOnce.should.be.eql(true);
			resourceErrorStub.args[0][0].resource.url.should.be.eql('http://nodejs.org/');
			resourceErrorStub.args[0][0].error.message.should.be.eql('REQUEST ERROR!!');
		});
	});

	it('should wait for async onResourceSaved actions before afterFinish and resolving', async () => {
		nock('http://example.com/').get('/').reply(200, 'OK');

		const events = [];

		class MyPlugin {
			apply(addAction) {
				addAction('onResourceSaved', async () => {
					await new Promise((resolve) => setTimeout(resolve, 50));
					events.push('onResourceSaved done');
				});
				addAction('afterFinish', () => { events.push('afterFinish'); });
			}
		}

		await scrape({
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			plugins: [ new MyPlugin() ]
		});
		events.push('scrape resolved');

		events.should.eql(['onResourceSaved done', 'afterFinish', 'scrape resolved']);
	});

	it('should not fail scrape if onResourceSaved action rejects', async () => {
		nock('http://example.com/').get('/').reply(200, 'OK');

		class MyPlugin {
			apply(addAction) {
				addAction('onResourceSaved', async () => { throw new Error('ACTION ERROR'); });
			}
		}

		const result = await scrape({
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			plugins: [ new MyPlugin() ]
		});

		result.length.should.eql(1);
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
			false.should.be.true;
		}).catch(() => {
			resourceErrorStub.calledOnce.should.be.eql(true);
			resourceErrorStub.args[0][0].resource.url.should.be.eql('http://nodejs.org/');
			resourceErrorStub.args[0][0].error.message.should.be.eql('REQUEST ERROR!!');
		});
	});
});
