import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs/promises';
import sinon from 'sinon';
import scrape from 'website-scraper';

const testDirname = './test/functional/resource-saver/.tmp';
const mockDirname = './test/functional/resource-saver/mocks';

describe('Functional: plugin for saving resources', () => {

	beforeEach(() => {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		await fs.rm(testDirname, { recursive: true, force: true });
	});

	let saveResourceStub, handleErrorStub, saveResourcePlugin;

	beforeEach(() => {
		saveResourceStub = sinon.stub().resolves().onCall(2).rejects(new Error('FS FAILED!'));
		handleErrorStub = sinon.stub().resolves();

		class SaveResourcePlugin {
			apply (registerAction) {
				registerAction('saveResource', saveResourceStub);
				registerAction('error', handleErrorStub);
			}
		}

		saveResourcePlugin = new SaveResourcePlugin();
	});

	it('should use passed resourceSaver when saving resource', () => {
		nock('http://example.com/').get('/').reply(200, 'OK');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			plugins: [ saveResourcePlugin ]
		};

		return scrape(options).catch(() => {
			should(saveResourceStub.calledOnce).be.eql(true);
			should(saveResourceStub.args[0][0].resource.url).be.eql('http://example.com/');
		});
	});

	it('should use passed resourceSaver on error', () => {
		nock('http://example.com/').get('/').replyWithError('SCRAPER AWFUL ERROR');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			plugins: [ saveResourcePlugin ],
			ignoreErrors: false
		};

		return scrape(options).catch(() => {
			should(handleErrorStub.calledOnce).be.eql(true);
			should(handleErrorStub.args[0][0].error.message).be.eql('SCRAPER AWFUL ERROR');
		});
	});

});
