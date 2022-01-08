import 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/circular-dependencies/.tmp';
const mockDirname = './test/functional/circular-dependencies/mocks';

describe('Functional circular dependencies', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should correctly load files with circular dependency', function() {
		const options = {
			urls: [
				{ url: 'http://example.com/index.html', filename: 'index.html'},
				{ url: 'http://example.com/about.html', filename: 'about.html'}
			],
			directory: testDirname,
			subdirectories: null,
			sources: [
				{selector: 'a', attr: 'href'},
				{selector: 'link', attr: 'href'}
			]
		};

		nock('http://example.com/').get('/index.html').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/about.html').replyWithFile(200, mockDirname + '/about.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/style.css').replyWithFile(200, mockDirname + '/style.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/style2.css').replyWithFile(200, mockDirname + '/style2.css', {'content-type': 'text/css'});

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/about.html').should.be.eql(true);
			fs.existsSync(testDirname + '/style.css').should.be.eql(true);
			fs.existsSync(testDirname + '/style2.css').should.be.eql(true);
		});
	});

});
