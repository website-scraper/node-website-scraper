var should = require('should');
var nock = require('nock');
var sinon = require('sinon');
require('sinon-as-promised');
var proxyquire = require('proxyquire');

describe('Request', function () {
	var makeRequest, makeStubbedRequest, requestStub;

	beforeEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();

		makeRequest = require('../../lib/request');

		requestStub = sinon.stub().yields(null, { request: {href: ''}, body: '', headers: {} });
		makeStubbedRequest = proxyquire('../../lib/request', {
			'request': {
				'get': requestStub
			}
		});
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	it('should call request with correct params', function () {
		var options = {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
			}
		};
		var url = 'http://www.google.com';

		return makeStubbedRequest(options, url).then(function () {
			var expectedOptions = {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
				},
				url: url
			};

			requestStub.calledOnce.should.be.eql(true);
			requestStub.calledWith(expectedOptions).should.be.eql(true);
		});
	});

	it('should add referer header if referer param was passed', function() {
		var options = {};
		var url = 'http://www.google.com';
		var referer = 'http://referer.com';

		return makeStubbedRequest(options, url, referer).then(function () {
			var expectedOptions = {
				headers: {
					referer: referer
				},
				url: url
			};

			requestStub.calledOnce.should.be.eql(true);
			requestStub.calledWith(expectedOptions).should.be.eql(true);
		});
	});

	it('should return object with url, body and mimeType properties', function () {
		var url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {
			'content-type': 'text/html; charset=utf-8'
		});

		return makeRequest({}, url).then(function (data) {
			data.should.have.properties(['url', 'body', 'mimeType']);
			data.url.should.be.eql('http://www.google.com/');
			data.body.should.be.eql('Hello from Google!');
			data.mimeType.should.be.eql('text/html');
		});
	});

	it('should return mimeType = null if content-type header was not found in response', function () {
		var url = 'http://www.google.com';
		nock(url).get('/').reply(200, 'Hello from Google!', {});

		return makeRequest({}, url).then(function (data) {
			data.should.have.properties(['url', 'body', 'mimeType']);
			data.url.should.be.eql('http://www.google.com/');
			data.body.should.be.eql('Hello from Google!');
			should(data.mimeType).be.eql(null);
		});
	});
});
