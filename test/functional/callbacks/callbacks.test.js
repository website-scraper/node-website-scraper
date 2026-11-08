import * as chai from 'chai';
const should = chai.should();

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

	describe('when notification actions reject', () => {
		let unhandledRejections;
		const onUnhandledRejection = (reason) => unhandledRejections.push(reason);

		beforeEach(() => {
			unhandledRejections = [];
			process.on('unhandledRejection', onUnhandledRejection);
		});

		afterEach(() => {
			process.off('unhandledRejection', onUnhandledRejection);
		});

		// unhandledRejection is emitted asynchronously, give it a chance to fire before asserting
		const flushUnhandledRejections = () => new Promise((resolve) => setTimeout(resolve, 10));

		it('should call onResourceError, run afterFinish and resolve if onResourceSaved action rejects and ignoreErrors = true', async () => {
			nock('http://example.com/').get('/').reply(200, 'OK');

			const resourceErrorStub = sinon.stub();
			const afterFinishStub = sinon.stub();

			class MyPlugin {
				apply(addAction) {
					// reject with non-Error value to make sure such rejections are handled too
					addAction('onResourceSaved', () => Promise.reject());
					addAction('onResourceError', resourceErrorStub);
					addAction('afterFinish', afterFinishStub);
				}
			}

			const result = await scrape({
				urls: [ 'http://example.com/' ],
				directory: testDirname,
				ignoreErrors: true,
				plugins: [ new MyPlugin() ]
			});
			await flushUnhandledRejections();

			result.length.should.eql(1);
			resourceErrorStub.calledOnce.should.be.eql(true);
			resourceErrorStub.args[0][0].resource.url.should.be.eql('http://example.com/');
			resourceErrorStub.args[0][0].error.should.be.instanceOf(Error);
			afterFinishStub.calledOnce.should.be.eql(true);
			unhandledRejections.should.eql([]);
		});

		it('should call onResourceError, error and afterFinish actions and reject if onResourceSaved action rejects and ignoreErrors = false', async () => {
			nock('http://example.com/').get('/').reply(200, 'OK');

			const events = [];
			const savedError = new Error('onResourceSaved failed');

			class MyPlugin {
				apply(addAction) {
					addAction('onResourceSaved', async () => {
						await new Promise((resolve) => setTimeout(resolve, 20));
						throw savedError;
					});
					addAction('onResourceError', ({error}) => { events.push(['onResourceError', error]); });
					addAction('error', ({error}) => { events.push(['error', error]); });
					addAction('afterFinish', () => { events.push(['afterFinish']); });
				}
			}

			let scrapeError;
			try {
				await scrape({
					urls: [ 'http://example.com/' ],
					directory: testDirname,
					plugins: [ new MyPlugin() ]
				});
			} catch (err) {
				scrapeError = err;
			}
			await flushUnhandledRejections();

			should.equal(scrapeError, savedError);
			events.should.eql([
				['onResourceError', savedError],
				['error', savedError],
				['afterFinish']
			]);
			unhandledRejections.should.eql([]);
		});

		it('should reject with original error if onResourceError action rejects and ignoreErrors = false', async () => {
			nock('http://example.com/').get('/').replyWithError('REQUEST ERROR!!');

			class MyPlugin {
				apply(addAction) {
					addAction('onResourceError', async () => {
						throw new Error('onResourceError failed');
					});
				}
			}

			let scrapeError;
			try {
				await scrape({
					urls: [ 'http://example.com/' ],
					directory: testDirname,
					plugins: [ new MyPlugin() ]
				});
			} catch (err) {
				scrapeError = err;
			}
			await flushUnhandledRejections();

			scrapeError.message.should.eql('REQUEST ERROR!!');
			unhandledRejections.should.eql([]);
		});

		it('should run afterFinish, resolve and not leave unhandled rejection if onResourceError action rejects', async () => {
			nock('http://example.com/').get('/').reply(200, 'OK');
			nock('http://nodejs.org/').get('/').replyWithError('REQUEST ERROR!!');

			const afterFinishStub = sinon.stub();

			class MyPlugin {
				apply(addAction) {
					addAction('onResourceError', async () => {
						throw new Error('onResourceError failed');
					});
					addAction('afterFinish', afterFinishStub);
				}
			}

			const result = await scrape({
				urls: [ 'http://example.com/', 'http://nodejs.org/' ],
				directory: testDirname,
				subdirectories: null,
				ignoreErrors: true,
				plugins: [ new MyPlugin() ]
			});
			await flushUnhandledRejections();

			result.length.should.eql(2);
			afterFinishStub.calledOnce.should.be.eql(true);
			unhandledRejections.should.eql([]);
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
			false.should.be.true;
		}).catch(() => {
			resourceErrorStub.calledOnce.should.be.eql(true);
			resourceErrorStub.args[0][0].resource.url.should.be.eql('http://nodejs.org/');
			resourceErrorStub.args[0][0].error.message.should.be.eql('REQUEST ERROR!!');
		});
	});
});
