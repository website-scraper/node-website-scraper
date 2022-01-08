import should from 'should';
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs-extra';
import scrape from 'website-scraper';

const testDirname = './test/functional/css-handling/.tmp';
const mockDirname = './test/functional/css-handling/mocks';

describe('Functional: css handling', function() {

	beforeEach(function() {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.removeSync(testDirname);
	});

	it('should correctly handle css files, style tags and style attributes and ignore css-like text inside common html tags', function() {
		nock('http://example.com/').get('/').replyWithFile(200, mockDirname + '/index.html', {'content-type': 'text/html'});
		nock('http://example.com/').get('/style.css').replyWithFile(200, mockDirname + '/style.css', {'content-type': 'text/css'});

		nock('http://example.com/').get('/style-import-1.css').reply(200, 'style-import-1.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/style-import-2.css').reply(200, 'style-import-2.css', {'content-type': 'text/css'});
		nock('http://example.com/').get('/style-tag.png').reply(200, 'style-tag.png');
		nock('http://example.com/').get('/style-attr.png').reply(200, 'style-attr.png');
		nock('http://example.com/').get('/css-like-text-in-html.png').reply(200, 'css-like-text-in-html.png');
		nock('http://example.com/').get('/external-style.png').reply(200, 'external-style.png');

		const options = {
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			maxDepth: 2,
			subdirectories: [
				{ directory: 'local', extensions: ['.png', '.css'] }
			]
		};

		return scrape(options).then(function() {
			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/local/style.css').should.be.eql(true);
			fs.existsSync(testDirname + '/local/style-import-1.css').should.be.eql(true);
			fs.existsSync(testDirname + '/local/style-import-2.css').should.be.eql(true);
			fs.existsSync(testDirname + '/local/style-tag.png').should.be.eql(true);
			fs.existsSync(testDirname + '/local/style-attr.png').should.be.eql(true);
			fs.existsSync(testDirname + '/local/css-like-text-in-html.png').should.be.eql(false);

			const indexHtml = fs.readFileSync(testDirname + '/index.html').toString();

			should(indexHtml).containEql('local/style-tag.png');
			should(indexHtml).containEql('local/style-attr.png');

			should(indexHtml).containEql('background: url(\'css-like-text-in-html.png\')');
		});
	});
});
