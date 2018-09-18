const should = require('should');
const nock = require('nock');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Request = require('../../lib/request');

describe('Request', () => {

	describe('constructor', () => {
		it('should set passed responseHandler', () => {
			let handler = sinon.stub();
			let r = new Request({
				httpResponseHandler: handler
			});
			should(r.handleResponse).be.eql(handler);
		});

		it('should set correct default handler and options if nothing passed', () => {
			let r1 = new Request({});
			should(r1.handleResponse).be.ok();
			should(r1.handleResponse).be.instanceOf(Function);

			let r2 = new Request();
			should(r2.handleResponse).be.ok();
			should(r2.handleResponse).be.instanceOf(Function);
		});
	});

	describe('get', () => {

		describe('using stubbed request', () => {
			let requestStub, Request, responseMock;

			beforeEach(() => {
				responseMock = { request: {href: ''}, body: '', headers: {} };
				requestStub = sinon.stub().yields(null, responseMock);
				Request = proxyquire('../../lib/request', {
					'request': {
						'get': requestStub
					}
				});
			});

			it('should call request with correct params', () => {
				const r = new Request({});
				const options = {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
					}
				};
				const url = 'http://www.google.com';

				return r.get(url, null, options).then(() => {
					const expectedOptions = {
						headers: {
							'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
						},
						url: url
					};

					requestStub.calledOnce.should.be.eql(true);
					requestStub.calledWith(expectedOptions).should.be.eql(true);
				});
			});

			it('should add referer header if referer param was passed', () => {
				let r = new Request({});

				let url = 'http://www.google.com';
				let referer = 'http://referer.com';

				return r.get(url, referer).then(() => {
					let expectedOptions = {
						headers: {
							referer: referer
						},
						url: url
					};

					requestStub.calledOnce.should.be.eql(true);
					requestStub.calledWith(expectedOptions).should.be.eql(true);
				});
			});

			it('should call handleResponse with correct params', () => {
				let handlerStub = sinon.stub().resolves('');
				let r = new Request({
					httpResponseHandler: handlerStub
				});

				return r.get('http://example.com').then(() => {
					should(r.handleResponse.calledOnce).be.eql(true);
					should(r.handleResponse.calledWith(responseMock)).be.eql(true);
				});
			});

			describe('transformResult from handleResponse', () => {
				it('should return object with body and metadata properties', () => {
					let handlerStub = sinon.stub().resolves({
						body: 'a',
						metadata: 'b'
					});
					let r = new Request({
						httpResponseHandler: handlerStub
					});

					return r.get('http://example.com').then((data) => {
						should(data.body).be.eql('a');
						should(data.metadata).be.eql('b');
					});
				});

				it('should return with metadata == null if metadata is not defined', () => {
					let handlerStub = sinon.stub().resolves({
						body: 'a'
					});
					let r = new Request({
						httpResponseHandler: handlerStub
					});

					return r.get('http://example.com').then((data) => {
						should(data.body).be.eql('a');
						should(data.metadata).be.eql(null);
					});
				});

				it('should transform string result', () => {
					let handlerStub = sinon.stub().resolves('test body');
					let r = new Request({
						httpResponseHandler: handlerStub
					});

					return r.get('http://example.com').then((data) => {
						should(data.body).be.eql('test body');
						should(data.metadata).be.eql(null);
					});
				});

				it('should be rejected if wrong result (no string nor object) returned', () => {
					let handlerStub = sinon.stub().resolves(['1', '2']);
					let r = new Request({
						httpResponseHandler: handlerStub
					});

					return r.get('http://example.com').then(() => {
						should(true).be.eql(false);
					}).catch((e) => {
						should(e).be.instanceOf(Error);
					});
				});
			});
		});

		describe('using nock', () => {
			beforeEach(() => {
				nock.cleanAll();
				nock.enableNetConnect();
			});

			afterEach(() => {
				nock.cleanAll();
				nock.enableNetConnect();
			});

			it('should return object with url, body, mimeType properties', () => {
				let url = 'http://www.google.com';
				nock(url).get('/').reply(200, 'Hello from Google!', {
					'content-type': 'text/html; charset=utf-8'
				});

				return new Request().get(url).then((data) => {
					data.should.have.properties(['url', 'body', 'mimeType']);
					data.url.should.be.eql('http://www.google.com/');
					data.body.should.be.eql('Hello from Google!');
					data.mimeType.should.be.eql('text/html');
				});
			});

			it('should return mimeType = null if content-type header was not found in response', () => {
				let url = 'http://www.google.com';
				nock(url).get('/').reply(200, 'Hello from Google!', {});

				return new Request().get(url).then((data) => {
					data.should.have.properties(['url', 'body', 'mimeType']);
					data.url.should.be.eql('http://www.google.com/');
					data.body.should.be.eql('Hello from Google!');
					should(data.mimeType).be.eql(null);
				});
			});
		});
	});
});
