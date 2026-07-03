import * as chai from 'chai';
const should = chai.should();
import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs';
import http from 'http';
import { buffer as readStreamBuffer } from 'stream/consumers';
import scrape from 'website-scraper';

const testDirname = './test/functional/streaming/.tmp';

// deterministic multi-MB binary payload
function generateBigBinary (sizeInBytes) {
	const chunk = Buffer.alloc(64 * 1024);
	for (let i = 0; i < chunk.length; i++) {
		chunk[i] = (i * 7 + 13) % 256;
	}
	return Buffer.concat(Array.from({length: Math.ceil(sizeInBytes / chunk.length)}, () => chunk), sizeInBytes);
}

describe('Functional: streaming resources to storage', function () {

	beforeEach(function () {
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.rmSync(testDirname, {recursive: true, force: true});
	});

	it('should save a large binary resource byte-identical', async function () {
		const pngBody = generateBigBinary(5 * 1024 * 1024);
		nock('http://example.com/').get('/').reply(200, '<html><body><img src="a.png"></body></html>', {'content-type': 'text/html'});
		nock('http://example.com/').get('/a.png').reply(200, pngBody, {'content-type': 'image/png'});

		await scrape({
			urls: ['http://example.com/'],
			directory: testDirname
		});

		const savedBytes = fs.readFileSync(testDirname + '/images/a.png');
		savedBytes.equals(pngBody).should.be.eql(true);
	});

	it('should free resource content from memory after save', async function () {
		nock('http://example.com/').get('/').reply(200, '<html><body><img src="a.png"></body></html>', {'content-type': 'text/html'});
		nock('http://example.com/').get('/a.png').reply(200, 'image content', {'content-type': 'image/png'});

		const result = await scrape({
			urls: ['http://example.com/'],
			directory: testDirname
		});

		(result[0].getText() === null).should.be.true;
		should.not.exist(result[0].getContentStream());

		const child = result[0].children.find((c) => c.url === 'http://example.com/a.png');
		(child.getText() === null).should.be.true;
		should.not.exist(child.getContentStream());

		// content is on disk instead
		fs.readFileSync(testDirname + '/images/a.png').toString().should.be.eql('image content');
	});

	it('should save body returned from afterResponse (buffered path)', async function () {
		nock('http://example.com/').get('/a.png').reply(200, 'original content', {'content-type': 'image/png'});

		class ReplaceBodyPlugin {
			apply (add) {
				add('afterResponse', async ({response}) => {
					const body = await response.getBody();
					return { body: Buffer.concat([body, Buffer.from(' + replaced')]) };
				});
			}
		}

		await scrape({
			urls: [{url: 'http://example.com/a.png', filename: 'a.png'}],
			directory: testDirname,
			plugins: [new ReplaceBodyPlugin()]
		});

		fs.readFileSync(testDirname + '/images/a.png').toString().should.be.eql('original content + replaced');
	});

	it('should keep resource streaming and attach metadata when afterResponse returns no body', async function () {
		const pngBody = generateBigBinary(1024 * 1024);
		nock('http://example.com/').get('/a.png').reply(200, pngBody, {'content-type': 'image/png'});

		class MetadataPlugin {
			apply (add) {
				add('afterResponse', ({response}) => {
					return { metadata: { statusCode: response.statusCode } };
				});
			}
		}

		const result = await scrape({
			urls: [{url: 'http://example.com/a.png', filename: 'a.png'}],
			directory: testDirname,
			plugins: [new MetadataPlugin()]
		});

		result[0].metadata.should.be.eql({statusCode: 200});
		fs.readFileSync(testDirname + '/images/a.png').equals(pngBody).should.be.eql(true);
	});

	it('should provide full content to multiple saveResource actions', async function () {
		const pngBody = generateBigBinary(1024 * 1024);
		nock('http://example.com/').get('/a.png').reply(200, pngBody, {'content-type': 'image/png'});

		const saved = [];
		class MultiStoragePlugin {
			apply (add) {
				add('saveResource', async ({resource}) => {
					saved.push(await readStreamBuffer(resource.getContentStream()));
				});
				add('saveResource', async ({resource}) => {
					saved.push(await readStreamBuffer(resource.getContentStream()));
				});
			}
		}

		await scrape({
			urls: [{url: 'http://example.com/a.png', filename: 'a.png'}],
			directory: testDirname,
			plugins: [new MultiStoragePlugin()]
		});

		saved.should.have.length(2);
		saved[0].equals(pngBody).should.be.eql(true);
		saved[1].equals(pngBody).should.be.eql(true);
	});

	it('should complete scraping when saveResource action does not consume the stream', async function () {
		nock('http://example.com/').get('/a.png').reply(200, generateBigBinary(1024 * 1024), {'content-type': 'image/png'});

		const seenResources = [];
		class IgnoreContentPlugin {
			apply (add) {
				add('saveResource', async ({resource}) => {
					seenResources.push(resource.url);
				});
			}
		}

		await scrape({
			urls: [{url: 'http://example.com/a.png', filename: 'a.png'}],
			directory: testDirname,
			plugins: [new IgnoreContentPlugin()]
		});

		seenResources.should.be.eql(['http://example.com/a.png']);
	});

	// nock cannot simulate a connection dying mid-body, so these tests use a real local server
	describe('mid-stream failures', function () {
		let server, baseUrl;

		beforeEach(function (done) {
			nock.enableNetConnect(/127\.0\.0\.1|localhost/);
			server = http.createServer((req, res) => {
				switch (req.url) {
					case '/':
						res.writeHead(200, {'content-type': 'text/html'});
						res.end('<html><body><img src="fail.png"><img src="fine.png"></body></html>');
						break;
					case '/fail.png':
						res.writeHead(200, {'content-type': 'image/png'});
						res.write('partial data');
						setTimeout(() => res.destroy(), 10);
						break;
					default:
						res.writeHead(200, {'content-type': 'image/png'});
						res.end('fine content');
				}
			});
			server.listen(0, '127.0.0.1', () => {
				baseUrl = `http://127.0.0.1:${server.address().port}`;
				done();
			});
		});

		afterEach(function (done) {
			server.close(done);
		});

		it('should continue scraping and leave no partial file when child fails mid-stream with ignoreErrors', async function () {
			await scrape({
				urls: [baseUrl + '/'],
				directory: testDirname,
				request: {retry: {limit: 0}},
				ignoreErrors: true
			});

			fs.existsSync(testDirname + '/index.html').should.be.eql(true);
			fs.existsSync(testDirname + '/images/fail.png').should.be.eql(false); // failed, partial file removed
			fs.readFileSync(testDirname + '/images/fine.png').toString().should.be.eql('fine content');
		});

		it('should reject and remove directory when a root resource fails mid-stream without ignoreErrors', async function () {
			try {
				await scrape({
					urls: [
						{url: baseUrl + '/fine.png', filename: 'fine.png'},
						{url: baseUrl + '/fail.png', filename: 'fail.png'}
					],
					directory: testDirname,
					request: {retry: {limit: 0}},
					ignoreErrors: false
				});
				throw new Error('expected scrape to reject');
			} catch (err) {
				err.message.should.not.be.eql('expected scrape to reject');
			}

			fs.existsSync(testDirname).should.be.eql(false);
		});
	});

	it('should handle redirect to an already requested resource with requestConcurrency 1', async function () {
		this.timeout(3000); // a deadlock in the request queue would exceed this

		nock('http://example.com/').get('/').reply(200,
			'<html><body><img src="a.png"><img src="b.png"></body></html>', {'content-type': 'text/html'});
		nock('http://example.com/').get('/a.png').reply(200, 'a content', {'content-type': 'image/png'});
		nock('http://example.com/').get('/b.png').reply(301, undefined, {location: 'http://example.com/a.png'});
		nock('http://example.com/').get('/a.png').reply(200, 'a content', {'content-type': 'image/png'});

		await scrape({
			urls: ['http://example.com/'],
			directory: testDirname,
			requestConcurrency: 1
		});

		fs.readFileSync(testDirname + '/images/a.png').toString().should.be.eql('a content');
		const html = fs.readFileSync(testDirname + '/index.html').toString();
		html.should.contain('src="images/a.png"');
	});
});
