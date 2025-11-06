import * as chai from 'chai';
chai.should();
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

	it('should call afterResponse with correct params', () => {
		const url = 'http://example.com';
		const scope = nock(url).get('/').reply(200, 'TEST BODY');
		let handlerStub = sinon.stub().resolves('');

		return request.get({url, afterResponse: handlerStub}).then(() => {
			scope.isDone().should.eql(true);
			handlerStub.calledOnce.should.eql(true);
			const afterResponseArgs = handlerStub.getCall(0).args[0];
			afterResponseArgs.response.body.should.eql('TEST BODY');
			afterResponseArgs.response.headers.should.eql({});
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
				data.body.should.eql('a');
				data.metadata.should.eql('b');
				data.encoding.should.eql('utf8');
			});
		});

		it('should return with metadata == null if metadata is not defined', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves({
				body: 'a'
			});

			return request.get({url, afterResponse: handlerStub}).then((data) => {
				data.body.should.eql('a');
				(data.metadata === null).should.be.true;
				data.encoding.should.eql('binary');
			});
		});

		it('should transform string result', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves('test body');

			return request.get({url, afterResponse: handlerStub}).then((data) => {
				data.body.should.eql('test body');
				(data.metadata === null).should.be.true;
			});
		});

		it('should be rejected if wrong result (no string nor object) returned', () => {
			const url = 'http://example.com';
			nock(url).get('/').reply(200, 'TEST BODY');
			const handlerStub = sinon.stub().resolves(['1', '2']);

			return request.get({url, afterResponse: handlerStub}).then(() => {
				true.should.eql(false);
			}).catch((e) => {
				e.should.be.instanceOf(Error);
				e.message.should.match(/Wrong response handler result. Expected string or object, but received/);
			});
		});
	});

	it('should return object with url, body, mimeType properties', () => {
		const url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {
			'content-type': 'text/html; charset=utf-8'
		});

		return request.get({url}).then((data) => {
			data.should.have.property('url');
			data.should.have.property('body');
			data.should.have.property('mimeType');
			data.url.should.eql('http://www.google.com/');
			data.body.should.eql('Hello from Google!');
			data.mimeType.should.eql('text/html');
			data.encoding.should.eql('utf8');
		});
	});

	it('should return mimeType = null if content-type header was not found in response', () => {
		let url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {});

		return request.get({url}).then((data) => {
			data.should.include.all.keys(['url', 'body', 'mimeType', 'encoding']);
			data.url.should.eql('http://www.google.com/');
			data.body.should.eql('Hello from Google!');
			data.encoding.should.eql('binary');
			data.should.have.property('mimeType', null);
		});
	});
});

describe('get encoding', () => {
	it('should return binary by default', () => {
		const result = request.getEncoding(null);

		result.should.eql('binary');
	});

	it('should return binary when no content-type header supplies', () => {
		const result = request.getEncoding({
			headers: {}
		});

		result.should.eql('binary');
	});

	it('should return binary when content type header doesn\'t include utf-8', () => {
		const result = request.getEncoding({
			headers: {}
		});

		result.should.eql('binary');
	});

	it('should return binary when content type header doesn\'t include utf-8', () => {
		const result = request.getEncoding({
			headers: {
				'content-type': 'text/html'
			}
		});

		result.should.eql('binary');
	});

	it('should return utf8 when content type includes utf-8', () => {
		const result = request.getEncoding({
			headers: {
				'content-type': 'text/html; charset=utf-8'
			}
		});

		result.should.eql('utf8');
	});

	it('should return utf8 response object includes it', () => {
		const result = request.getEncoding({
			encoding: 'utf8'
		});

		result.should.eql('utf8');
	});
});

describe('transformResult', () => {
	it('should throw with weird shaped response', () => {
		try {
			request.transformResult([1,2,3]);

			// We shouldn't get here.
			true.should.eql(false);
		} catch (e) {
			e.should.be.instanceOf(Error);
			e.message.should.eql('Wrong response handler result. Expected string or object, but received array');
		}
	});

	it('should pass through error', () => {
		try {
			request.transformResult(new Error('Oh no'));

			// We shouldn't get here.
			true.should.eql(false);
		} catch (e) {
			e.should.be.instanceOf(Error);
			e.message.should.eql('Oh no');
		}
	});

	it('should throw with boolean input', () => {
		try {
			request.transformResult(true);

			// We shouldn't get here.
			true.should.eql(false);
		} catch (e) {
			e.should.be.instanceOf(Error);
			e.message.should.eql('Wrong response handler result. Expected string or object, but received boolean');
		}
	});

	it('should handle object', () => {
		const result = request.transformResult({
			body: 'SOME BODY',
			encoding: 'utf8',
			metadata: { foo: 'bar' }
		});

		result.should.have.property('body', 'SOME BODY');
		result.should.have.property('encoding', 'utf8');
		result.should.have.property('metadata').that.eql({ foo: 'bar' });
	});

	it('should handle object with empty body string', () => {
		const result = request.transformResult({
			body: '',
			encoding: 'utf8',
		});

		result.should.have.property('body', '');
		result.should.have.property('encoding', 'utf8');
		result.should.have.property('metadata', null);
	});

	it('should handle object with defaults and buffer body', () => {
		const result = request.transformResult({
			body: Buffer.from('SOME BODY'),
		});

		result.should.have.property('body', 'SOME BODY');
		result.should.have.property('encoding', 'binary');
		result.should.have.property('metadata', null);
	});

	it('should handle raw string input', () => {
		const result = request.transformResult('SOME BODY');

		result.should.have.property('body', 'SOME BODY');
		result.should.have.property('encoding', 'binary');
		result.should.have.property('metadata', null);
	});

	it('should handle null input', () => {
		const result = request.transformResult(null);
		(result === null).should.be.true;
	});

	it('should handle undefined input', () => {
		const result = request.transformResult(undefined);
		(result === null).should.be.true;
	});
});
