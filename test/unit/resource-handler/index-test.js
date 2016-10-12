var should = require('should');
var sinon = require('sinon');
require('sinon-as-promised');
var proxyquire = require('proxyquire');
var Resource = require('../../../lib/resource');

describe('ResourceHandler', function() {
	var ResourceHandler;
	var noopStub;
	var cssLoadStub;
	var htmlLoadStub;

	beforeEach(function() {
		noopStub = sinon.stub().resolves();
		cssLoadStub = sinon.stub().resolves();
		htmlLoadStub = sinon.stub().resolves();

		ResourceHandler = proxyquire('../../../lib/resource-handler', {
			'lodash': {
				'noop': noopStub
			},
			'./html': htmlLoadStub,
			'./css': cssLoadStub
		});
	});

	describe('constructor', function() {
		it('should pick supported options', function() {
			var options = {
				a: 1,
				b: 2,
				prettifyUrls: 'a',
				maxDepth: 'b',
				defaultFilename: 'test',
				sources: 'dummy sources'
			};
			var resHandler = new ResourceHandler(options);
			resHandler.options.should.eql({
				prettifyUrls: 'a',
				maxDepth: 'b',
				defaultFilename: 'test',
				sources: 'dummy sources'
			});
		});
		it('should set context', function () {
			var context = { dummy: 'context' };
			var resHandler = new ResourceHandler({}, context);
			resHandler.context.should.eql(context);
		});
	});

	describe('#getResourceHandler', function() {
		it('should return noop if resource has depth > max', function() {
			var options = { maxDepth: 2 };

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('html');
			sinon.stub(r, 'getDepth').returns(10);

			var resHandler = new ResourceHandler(options);

			var handleResource = resHandler.getResourceHandler(r);
			handleResource({}, r).then(function() {
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

			var resHandler = new ResourceHandler(options);

			var handleResource = resHandler.getResourceHandler(r);
			handleResource({}, r).then(function() {
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

			var resHandler = new ResourceHandler(options);

			var handleResource = resHandler.getResourceHandler(r);
			handleResource({}, r).then(function() {
				noopStub.called.should.be.eql(false);
				cssLoadStub.called.should.be.eql(true);
				htmlLoadStub.called.should.be.eql(true);
			});
		});
	});

	describe('#handleResource', function() {
		it('should call getResourceHandler and create correct context', function() {
			var options = { defaultFilename: 'test' };
			var reqResStub = sinon.stub().resolves();
			var loadResStub = sinon.stub().resolves();
			var context = {
				requestResource: reqResStub,
				loadResource: loadResStub
			};
			var resHandler = new ResourceHandler(options, context);
			var getHandlerStub = sinon.stub().resolves();
			resHandler.getResourceHandler = sinon.stub().returns(getHandlerStub);

			var r = new Resource('http://example.com');
			return resHandler.handleResource(r).then(function() {
				getHandlerStub.calledOnce.should.be.eql(true);
				getHandlerStub.args[0][0].options.should.be.eql(options);
				getHandlerStub.args[0][1].should.be.eql(r);

				reqResStub.called.should.be.eql(false);
				getHandlerStub.args[0][0].requestResource();
				reqResStub.called.should.be.eql(true);

				loadResStub.called.should.be.eql(false);
				getHandlerStub.args[0][0].loadResource();
				loadResStub.called.should.be.eql(true);
			});
		});
	});

});
