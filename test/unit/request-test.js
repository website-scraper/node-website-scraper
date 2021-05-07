import should from 'should';
import sinon from 'sinon';
import nock from 'nock';
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
			scope.isDone().should.be.eql(true);
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
			scope.isDone().should.be.eql(true);
		});
	});

	it('should call afterResponse with correct params', () => {
		const url = 'http://example.com';
		const scope = nock(url).get('/').reply(200, 'TEST BODY');
		let handlerStub = sinon.stub().resolves('');

		return request.get({url, afterResponse: handlerStub}).then(() => {
			scope.isDone().should.be.eql(true);
			should(handlerStub.calledOnce).be.eql(true);
			const afterResponseArgs = handlerStub.getCall(0).args[0];
			should(afterResponseArgs.response.body).be.eql('TEST BODY');
			should(afterResponseArgs.response.headers).be.eql({});
		});
	});

	describe('transformResult from afterResponse', () => {
		it('should return object with body and metadata properties', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves({
				body: 'a',
				metadata: 'b'
			});

			return request.get({url, afterResponse: handlerStub}).then((data) => {
				should(data.body).be.eql('a');
				should(data.metadata).be.eql('b');
			});
		});

		it('should return with metadata == null if metadata is not defined', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves({
				body: 'a'
			});

			return request.get({url, afterResponse: handlerStub}).then((data) => {
				should(data.body).be.eql('a');
				should(data.metadata).be.eql(null);
			});
		});

		it('should transform string result', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves('test body');

			return request.get({url, afterResponse: handlerStub}).then((data) => {
				should(data.body).be.eql('test body');
				should(data.metadata).be.eql(null);
			});
		});

		it('should be rejected if wrong result (no string nor object) returned', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves(['1', '2']);

			return request.get({url, afterResponse: handlerStub}).then(() => {
				should(true).be.eql(false);
			}).catch((e) => {
				should(e).be.instanceOf(Error);
				should(e.message).match(/Wrong response handler result. Expected string or object, but received/);
			});
		});
	});

	it('should return object with url, body, mimeType properties', () => {
		const url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {
			'content-type': 'text/html; charset=utf-8'
		});

		return request.get({url}).then((data) => {
			data.should.have.properties(['url', 'body', 'mimeType']);
			data.url.should.be.eql('http://www.google.com/');
			data.body.should.be.eql('Hello from Google!');
			data.mimeType.should.be.eql('text/html');
		});
	});

	it('should return mimeType = null if content-type header was not found in response', () => {
		let url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {});

		return request.get({url}).then((data) => {
			data.should.have.properties(['url', 'body', 'mimeType']);
			data.url.should.be.eql('http://www.google.com/');
			data.body.should.be.eql('Hello from Google!');
			should(data.mimeType).be.eql(null);
		});
	});
});
