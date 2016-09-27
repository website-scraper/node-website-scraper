var should = require('should');
var sinon = require('sinon');
require('sinon-as-promised');
var proxyquire = require('proxyquire');
var Resource = require('../../../lib/resource');

describe('ResourceHandlerGetter', function() {
	var getResourceHandler;
	var noopStub;
	var cssLoadStub;
	var htmlLoadStub;

	beforeEach(function() {
		noopStub = sinon.stub().resolves();
		cssLoadStub = sinon.stub().resolves();
		htmlLoadStub = sinon.stub().resolves();

		getResourceHandler = proxyquire('../../../lib/file-handlers', {
			'lodash': {
				'noop': noopStub
			},
			'./html': htmlLoadStub,
			'./css': cssLoadStub
		});
	});

	it('should return noop if resource has depth > max', function() {
		var options = { maxDepth: 2 };

		var r = new Resource('http://example.com/');
		sinon.stub(r, 'getType').returns('html');
		sinon.stub(r, 'getDepth').returns(10);

		var resourceHandler = getResourceHandler(options, r);
		resourceHandler({}, r).then(function() {
			noopStub.called.should.be.eql(true);
			cssLoadStub.called.should.be.eql(false);
			htmlLoadStub.called.should.be.eql(false);
		});
	});

	it('should return css loader if file has css type', function() {
		var options = { maxDepth: 2 };

		var r = new Resource('http://example.com/');
		sinon.stub(r, 'getType').returns('css');
		sinon.stub(r, 'getDepth').returns(1);

		var resourceHandler = getResourceHandler(options, r);
		resourceHandler({}, r).then(function() {
			noopStub.called.should.be.eql(false);
			cssLoadStub.called.should.be.eql(true);
			htmlLoadStub.called.should.be.eql(false);
		});
	});

	it('should return html & css loader if file has html type', function() {
		var options = { maxDepth: 2 };

		var r = new Resource('http://example.com/');
		sinon.stub(r, 'getType').returns('html');
		sinon.stub(r, 'getDepth').returns(1);

		var resourceHandler = getResourceHandler(options, r);

		resourceHandler({}, r).then(function() {
			noopStub.called.should.be.eql(false);
			cssLoadStub.called.should.be.eql(true);
			htmlLoadStub.called.should.be.eql(true);
		});
	});
});
