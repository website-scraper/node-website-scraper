const should = require('should');
const nock = require('nock');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const request = require('../../lib/request');

describe('request', () => {

	describe('get', () => {

		describe('using stubbed request', () => {
			let requestStub, request, responseMock;

			beforeEach(() => {
				responseMock = { request: {href: ''}, body: '', headers: {} };
				requestStub = sinon.stub().yields(null, responseMock);
				request = proxyquire('../../lib/request', {
					'request': {
						'get': requestStub
					}
				});
			});

			it('should call request with correct params', () => {
				const options = {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
					}
				};
				const url = 'http://www.google.com';

				return request.get({url, options}).then(() => {
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
				let url = 'http://www.google.com';
				let referer = 'http://referer.com';

				return request.get({url, referer}).then(() => {
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

			it('should call afterResponse with correct params', () => {
				let handlerStub = sinon.stub().resolves('');

				return request.get({url: 'http://example.com', afterResponse: handlerStub}).then(() => {
					should(handlerStub.calledOnce).be.eql(true);
					should(handlerStub.calledWith({response: responseMock})).be.eql(true);
				});
			});

			describe('transformResult from afterResponse', () => {
				it('should return object with body and metadata properties', () => {
					let handlerStub = sinon.stub().resolves({
						body: 'a',
						metadata: 'b'
					});

					return request.get({url: 'http://example.com', afterResponse: handlerStub}).then((data) => {
						should(data.body).be.eql('a');
						should(data.metadata).be.eql('b');
					});
				});

				it('should return with metadata == null if metadata is not defined', () => {
					let handlerStub = sinon.stub().resolves({
						body: 'a'
					});

					return request.get({url: 'http://example.com', afterResponse: handlerStub}).then((data) => {
						should(data.body).be.eql('a');
						should(data.metadata).be.eql(null);
					});
				});

				it('should transform string result', () => {
					let handlerStub = sinon.stub().resolves('test body');

					return request.get({url: 'http://example.com', afterResponse: handlerStub}).then((data) => {
						should(data.body).be.eql('test body');
						should(data.metadata).be.eql(null);
					});
				});

				it('should be rejected if wrong result (no string nor object) returned', () => {
					let handlerStub = sinon.stub().resolves(['1', '2']);

					return request.get({url: 'http://example.com', afterResponse: handlerStub}).then(() => {
						should(true).be.eql(false);
					}).catch((e) => {
						should(e).be.instanceOf(Error);
						should(e.message).match(/Wrong response handler result. Expected string or object, but received/);
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
	});
});
