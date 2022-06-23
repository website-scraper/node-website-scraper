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
				metadata: 'b',
				encoding: 'utf8'
			});

			return request.get({url, afterResponse: handlerStub}).then((data) => {
				should(data.body).be.eql('a');
				should(data.metadata).be.eql('b');
				should(data.encoding).be.eql('utf8');
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
				should(data.encoding).be.eql('binary');
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
			data.encoding.should.be.eql('utf8');
		});
	});

	it('should return mimeType = null if content-type header was not found in response', () => {
		let url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {});

		return request.get({url}).then((data) => {
			data.should.have.properties(['url', 'body', 'mimeType']);
			data.url.should.be.eql('http://www.google.com/');
			data.body.should.be.eql('Hello from Google!');
			data.encoding.should.be.eql('binary');
			should(data.mimeType).be.eql(null);
		});
	});
});

describe('get encoding', () => {
	it('should return binary by default', () => {
		const result = request.getEncoding(null);

		should(result).be.eql('binary');
	});

	it('should return binary when no content-type header supplies', () => {
		const result = request.getEncoding({
			headers: {}
		});

		should(result).be.eql('binary');
	});

	it('should return binary when content type header doesn\'t include utf-8', () => {
		const result = request.getEncoding({
			headers: {}
		});

		should(result).be.eql('binary');
	});

	it('should return binary when content type header doesn\'t include utf-8', () => {
		const result = request.getEncoding({
			headers: {
				'content-type': 'text/html'
			}
		});

		should(result).be.eql('binary');
	});

	it('should return utf8 when content type includes utf-8', () => {
		const result = request.getEncoding({
			headers: {
				'content-type': 'text/html; charset=utf-8'
			}
		});

		should(result).be.eql('utf8');
	});

	it('should return utf8 response object includes it', () => {
		const result = request.getEncoding({
			encoding: 'utf8'
		});

		should(result).be.eql('utf8');
	});
});

describe('transformResult', () => {
	it('should throw with weird shaped response', () => {
		try {
			request.transformResult([1,2,3]);

			// We shouldn't get here.
			should(true).eql(false);
		} catch (e) {
			should(e).be.instanceOf(Error);
			should(e.message).eql('Wrong response handler result. Expected string or object, but received array');
		}
	});

	it('should pass through error', () => {
		try {
			request.transformResult(new Error('Oh no'));

			// We shouldn't get here.
			should(true).eql(false);
		} catch (e) {
			should(e).be.instanceOf(Error);
			should(e.message).eql('Oh no');
		}
	});

	it('should throw with boolean input', () => {
		try {
			request.transformResult(true);

			// We shouldn't get here.
			should(true).eql(false);
		} catch (e) {
			should(e).be.instanceOf(Error);
			should(e.message).eql('Wrong response handler result. Expected string or object, but received boolean');
		}
	});

	it('should handle object', () => {
		const result = request.transformResult({
			body: 'SOME BODY',
			encoding: 'utf8',
			metadata: { foo: 'bar' }
		});

		should(result).have.property('body', 'SOME BODY');
		should(result).have.property('encoding', 'utf8');
		should(result).have.property('metadata', { foo: 'bar' });
	});

	it('should handle object with empty body string', () => {
		const result = request.transformResult({
			body: '',
			encoding: 'utf8',
		});

		should(result).have.property('body', '');
		should(result).have.property('encoding', 'utf8');
		should(result).have.property('metadata', null);
	});

	it('should handle object with defaults and buffer body', () => {
		const result = request.transformResult({
			body: Buffer.from('SOME BODY'),
		});

		should(result).have.property('body', 'SOME BODY');
		should(result).have.property('encoding', 'binary');
		should(result).have.property('metadata', null);
	});

	it('should handle raw string input', () => {
		const result = request.transformResult('SOME BODY');

		should(result).have.property('body', 'SOME BODY');
		should(result).have.property('encoding', 'binary');
		should(result).have.property('metadata', null);
	});

	it('should handle null input', () => {
		const result = request.transformResult(null);

		should(result).eqls(null);
	});

	it('should handle undefined input', () => {
		const result = request.transformResult(undefined);

		should(result).eqls(null);
	});
});
