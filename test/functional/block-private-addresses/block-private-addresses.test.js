import * as chai from 'chai';
chai.should();

import '../../utils/assertions.js';
import nock from 'nock';
import fs from 'fs';
import http from 'http';
import scrape, { BlockPrivateAddressesPlugin } from 'website-scraper';

const testDirname = './test/functional/block-private-addresses/.tmp';

describe('Functional BlockPrivateAddressesPlugin', function () {
	let internalServer, internalPort, internalHits;

	before(function (done) {
		internalHits = 0;
		internalServer = http.createServer((req, res) => {
			internalHits++;
			res.setHeader('content-type', 'image/png');
			res.end('INTERNAL-SECRET');
		});
		internalServer.listen(0, '127.0.0.1', () => {
			internalPort = internalServer.address().port;
			done();
		});
	});

	after(function (done) {
		internalServer.close(done);
	});

	beforeEach(function () {
		nock.cleanAll();
		nock.disableNetConnect();
		// requests to the local server must reach the real network stack, so that the plugin's dns lookup runs
		nock.enableNetConnect(/^(localhost|127\.0\.0\.1)(:\d+)?$/);
	});

	afterEach(function () {
		nock.cleanAll();
		nock.enableNetConnect();
		fs.rmSync(testDirname, {recursive: true, force: true});
	});

	it('should skip resources on private addresses reached directly, through dns or through a redirect', async function () {
		nock('http://example.com/').get('/').reply(200, `<html><body>
			<img src="http://127.0.0.1:${internalPort}/direct.png">
			<img src="http://localhost:${internalPort}/dns.png">
			<img src="/redirect.png">
			<img src="/ok.png">
		</body></html>`, {'content-type': 'text/html'});
		nock('http://example.com/').get('/redirect.png').reply(302, '', {'Location': `http://127.0.0.1:${internalPort}/redirected.png`});
		nock('http://example.com/').get('/ok.png').reply(200, 'ok', {'content-type': 'image/png'});

		const errors = [];
		class CollectErrorsPlugin {
			apply (registerAction) {
				registerAction('onResourceError', ({resource, error}) => errors.push({url: resource.getUrl(), message: error.message}));
			}
		}

		await scrape({
			urls: [ 'http://example.com/' ],
			directory: testDirname,
			subdirectories: null,
			ignoreErrors: true,
			plugins: [ new BlockPrivateAddressesPlugin(), new CollectErrorsPlugin() ]
		});

		internalHits.should.be.eql(0);
		fs.readdirSync(testDirname).sort().should.be.eql(['index.html', 'ok.png']);
		fs.readFileSync(testDirname + '/index.html').toString().should.contain('<img src="ok.png">');

		errors.map((e) => e.url).sort().should.be.eql([
			`http://127.0.0.1:${internalPort}/direct.png`,
			'http://example.com/redirect.png',
			`http://localhost:${internalPort}/dns.png`
		]);
		errors.find((e) => e.url.endsWith('/direct.png')).message.should.match(/Blocked request to private address 127\.0\.0\.1/);
		errors.find((e) => e.url.endsWith('/dns.png')).message.should.match(/Blocked request to localhost: it resolves to private address/);
		errors.find((e) => e.url.endsWith('/redirect.png')).message.should.match(/Blocked request to private address 127\.0\.0\.1/);
	});

	it('should fail the scrape on a blocked initial url when ignoreErrors is false', async function () {
		let error;
		try {
			await scrape({
				urls: [ `http://127.0.0.1:${internalPort}/` ],
				directory: testDirname,
				plugins: [ new BlockPrivateAddressesPlugin() ]
			});
		} catch (err) {
			error = err;
		}

		error.message.should.match(/Blocked request to private address 127\.0\.0\.1/);
		internalHits.should.be.eql(0);
		fs.existsSync(testDirname).should.be.eql(false);
	});
});
