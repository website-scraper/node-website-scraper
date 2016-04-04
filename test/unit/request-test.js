require('should');

var nock = require('nock');
var sinon = require('sinon');
require('sinon-as-promised');
var proxyquire = require('proxyquire');
var request = require('../../lib/request');

describe('Request', function () {

	beforeEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	afterEach(function() {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	describe('#makeRequest', function () {

		it('should call request with correct params', function(done) {
			var responseMock = { request: {href: ''}, body: '' };
			var requestStub = sinon.stub().yields(null, responseMock);

			var customRequest = proxyquire('../../lib/request', {
				'request': {
					'get': requestStub
				}
			});
			var options = {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
				}
			};
			var url = 'http://www.google.com';

			customRequest(options, url).then(function () {
				var expectedOptions = {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1;'
					},
					url: url
				};

				requestStub.calledOnce.should.be.eql(true);
				requestStub.calledWith(expectedOptions).should.be.eql(true);
				done();
			}).catch(done);

		});

		it('should return object with url and body properties', function (done) {
			var url = 'http://www.google.com';
			nock(url).get('/').reply(200, 'Hello from Google!');

			request({}, url).then(function (data) {
				data.should.have.properties(['url', 'body']);
				data.url.should.be.eql('http://www.google.com/');
				data.body.should.be.eql('Hello from Google!');
				done();
			}).catch(done);
		});
	});
});
