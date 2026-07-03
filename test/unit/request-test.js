import * as chai from 'chai';
const should = chai.should();
import sinon from 'sinon';
import nock from 'nock';
import { text as readStreamText, buffer as readStreamBuffer } from 'stream/consumers';
import request from '../../lib/request.js';

describe('request', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	it('should call request with correct params', () => {
		const url = 'http://www.google.com';
		const scope = nock(url)
			.get('/')
			.matchHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 4.2.1;')
			.reply(200);

		const options = {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
			}
		};

		return request.get({url, options}).then(() => {
			scope.isDone().should.eql(true);
		});
	});

	it('should add referer header if referer param was passed', () => {
		const url = 'http://www.google.com';
		const referer = 'http://referer.com';

		const scope = nock(url)
			.get('/')
			.matchHeader('referer', 'http://referer.com')
			.reply(200);

		return request.get({url, referer}).then(() => {
			scope.isDone().should.eql(true);
		});
	});

	it('should return object with url, statusCode, mimeType, encoding and stream with the body', async () => {
		const url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {
			'content-type': 'text/html; charset=utf-8'
		});

		const data = await request.get({url});
		data.should.have.property('url');
		data.should.have.property('statusCode');
		data.should.have.property('mimeType');
		data.should.have.property('stream');
		data.url.should.eql('http://www.google.com/');
		data.statusCode.should.eql(200);
		data.mimeType.should.eql('text/html');
		data.encoding.should.eql('utf8');
		(data.metadata === null).should.be.true;

		const body = await readStreamText(data.stream);
		body.should.eql('Hello from Google!');
	});

	it('should return mimeType = null and binary encoding if content-type header was not found in response', async () => {
		const url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {});

		const data = await request.get({url});
		data.url.should.eql('http://www.google.com/');
		data.encoding.should.eql('binary');
		data.should.have.property('mimeType', null);
	});

	it('should retry transient network errors before response', async () => {
		const url = 'http://retry.example.com';
		nock(url).get('/').replyWithError(Object.assign(new Error('connection reset'), {code: 'ECONNRESET'}));
		nock(url).get('/').reply(200, 'recovered');

		const data = await request.get({url, options: {retry: {limit: 1}}});
		data.statusCode.should.eql(200);
		const body = await readStreamText(data.stream);
		body.should.eql('recovered');
	});

	it('should reject when request fails without retries left', async () => {
		const url = 'http://fail.example.com';
		nock(url).get('/').replyWithError(Object.assign(new Error('connection reset'), {code: 'ECONNRESET'}));

		try {
			await request.get({url, options: {retry: {limit: 0}}});
			throw new Error('expected request.get to reject');
		} catch (err) {
			err.code.should.eql('ECONNRESET');
		}
	});

	describe('afterResponse', () => {
		it('should call afterResponse with url, statusCode, headers and getBody', async () => {
			const url = 'http://example.com';
			const scope = nock(url).get('/').reply(200, 'TEST BODY', {'content-type': 'text/html'});
			const handlerStub = sinon.stub().resolves({});

			await request.get({url, afterResponse: handlerStub});
			scope.isDone().should.eql(true);
			handlerStub.calledOnce.should.eql(true);

			const {response} = handlerStub.getCall(0).args[0];
			response.url.should.eql('http://example.com/');
			response.statusCode.should.eql(200);
			response.headers.should.have.property('content-type', 'text/html');
			response.getBody.should.be.a('function');
		});

		it('should provide body via getBody', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');

			let receivedBody;
			const afterResponse = async ({response}) => {
				receivedBody = await response.getBody();
				return {};
			};

			const data = await request.get({url, afterResponse});
			receivedBody.should.be.instanceOf(Buffer);
			receivedBody.toString().should.eql('TEST BODY');

			// original stream was consumed by getBody - body must still be readable from result
			const body = await readStreamText(data.stream);
			body.should.eql('TEST BODY');
		});

		it('should memoize getBody', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');

			const afterResponse = async ({response}) => {
				const first = await response.getBody();
				const second = await response.getBody();
				first.should.be.equal(second);
				return {};
			};

			await request.get({url, afterResponse});
		});

		it('should return null and skip resource when action returns null', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves(null);

			const data = await request.get({url, afterResponse: handlerStub});
			should.not.exist(data);
		});

		it('should replace body when action returns object with body', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves({
				body: 'a',
				metadata: 'b',
				encoding: 'utf8'
			});

			const data = await request.get({url, afterResponse: handlerStub});
			data.metadata.should.eql('b');
			data.encoding.should.eql('utf8');
			const body = await readStreamText(data.stream);
			body.should.eql('a');
		});

		it('should support Buffer body', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const bodyBuffer = Buffer.from([0xff, 0x00, 0xab]);
			const handlerStub = sinon.stub().resolves({body: bodyBuffer});

			const data = await request.get({url, afterResponse: handlerStub});
			(data.metadata === null).should.be.true;
			const body = await readStreamBuffer(data.stream);
			body.should.eql(bodyBuffer);
		});

		it('should keep original body streaming when action returns metadata only', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves({metadata: {foo: 'bar'}});

			const data = await request.get({url, afterResponse: handlerStub});
			data.metadata.should.eql({foo: 'bar'});
			const body = await readStreamText(data.stream);
			body.should.eql('TEST BODY');
		});

		it('should be rejected if wrong result (no null nor object) returned', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves(['1', '2']);

			try {
				await request.get({url, afterResponse: handlerStub});
				throw new Error('expected request.get to reject');
			} catch (e) {
				e.message.should.match(/Wrong afterResponse result. Expected null or object.*but received array/);
			}
		});

		it('should be rejected if string returned (removed in v7)', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves('test body');

			try {
				await request.get({url, afterResponse: handlerStub});
				throw new Error('expected request.get to reject');
			} catch (e) {
				e.message.should.match(/Wrong afterResponse result.*but received string/);
			}
		});

		it('should be rejected with error thrown by action', async () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().rejects(new Error('action failed'));

			try {
				await request.get({url, afterResponse: handlerStub});
				throw new Error('expected request.get to reject');
			} catch (e) {
				e.message.should.eql('action failed');
			}
		});
	});
});
