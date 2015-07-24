require('should');

var nock = require('nock');
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

	describe('#getDefaultOptions', function () {
		it('should return object', function () {
			request.getDefaultOptions().should.be.instanceof(Object);
		});
	});

	describe('#getCustomOptions', function () {
		it('should return object', function () {
			request.getCustomOptions().should.be.instanceof(Object);
		});

		it('should return object with all properties of argument object if argument object is set', function () {
			var opts = {a: 1, b: 2};
			request.getCustomOptions(opts).should.have.properties(opts);
		});

		it('should return default options if argument object is not set', function () {
			var defaultOpts = request.getDefaultOptions();
			request.getCustomOptions().should.be.eql(defaultOpts);
		});
	});

	describe('#makeRequest', function () {
		it('should return object with url and body properties', function (done) {
			var url = 'http://www.google.com';
			nock(url).get('/').reply(200, 'Hello from Google!');

			request.makeRequest({}, url).then(function (data) {
				data.should.have.properties(['url', 'body']);
				done();
			}).catch(done);
		});
	});
});
