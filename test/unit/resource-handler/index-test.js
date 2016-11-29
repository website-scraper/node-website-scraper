var should = require('should');
var sinon = require('sinon');
var Bluebird = require('bluebird');
require('sinon-as-promised')(Bluebird);
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
		it('should return css loader if file has css type', function() {
			var options = { maxDepth: 2 };

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('css');

			var resHandler = new ResourceHandler(options);

			var handleResource = resHandler.getResourceHandler(r);
			return handleResource({}, r).then(function() {
				noopStub.called.should.be.eql(false);
				cssLoadStub.called.should.be.eql(true);
				htmlLoadStub.called.should.be.eql(false);
			});
		});

		it('should return html & css loader if file has html type', function() {
			var options = { maxDepth: 2 };

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('html');

			var resHandler = new ResourceHandler(options);

			var handleResource = resHandler.getResourceHandler(r);
			return handleResource({}, r).then(function() {
				noopStub.called.should.be.eql(false);
				cssLoadStub.called.should.be.eql(true);
				htmlLoadStub.called.should.be.eql(true);
			});
		});

		it('should return noop if file has other type', function() {
			var options = { maxDepth: 2 };

			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('other');

			var resHandler = new ResourceHandler(options);

			var handleResource = resHandler.getResourceHandler(r);
			return handleResource({}, r).then(function() {
				noopStub.called.should.be.eql(true);
				cssLoadStub.called.should.be.eql(false);
				htmlLoadStub.called.should.be.eql(false);
			});
		});
	});

	describe('#handleResource', function() {
		it('should call getResourceHandler and create correct context', function() {
			var options = { defaultFilename: 'test' };
			var context = {
				requestResource: sinon.stub().resolves(),
				loadResource: sinon.stub().resolves()
			};
			var resHandler = new ResourceHandler(options, context);
			var getHandlerStub = sinon.stub().resolves();
			resHandler.getResourceHandler = sinon.stub().returns(getHandlerStub);
			var handleChildResStub = sinon.stub(ResourceHandler.prototype, 'handleChildrenResources').resolves();

			var r = new Resource('http://example.com');
			return resHandler.handleResource(r).then(function() {
				// options
				getHandlerStub.calledOnce.should.be.eql(true);
				getHandlerStub.args[0][0].options.should.be.eql(options);

				// handleChildrenResources callback
				handleChildResStub.called.should.be.eql(false);
				getHandlerStub.args[0][0].handleChildrenResources();
				handleChildResStub.called.should.be.eql(true);

				// resource
				getHandlerStub.args[0][1].should.be.eql(r);
			});
		});
	});

	describe('#handleChildrenResources', function () {
		var pathContainer, parentResource, scraperContext, resHandler;

		beforeEach(function () {
			pathContainer = {};
			pathContainer.getPaths = sinon.stub();
			pathContainer.updateText = sinon.stub();

			parentResource = new Resource('http://example.com', 'test.txt');

			scraperContext = {
				requestResource: sinon.stub().resolves(),
				loadResource: sinon.stub().resolves()
			};

			resHandler = new ResourceHandler({defaultFilename: 'index.html'}, scraperContext);
		});

		it('should not call requestResource if no paths in text', function () {
			pathContainer.getPaths = sinon.stub().returns([]);

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.requestResource.called.should.be.eql(false);
			});
		});

		it('should call requestResource once with correct params', function () {
			pathContainer.getPaths.returns(['test.png']);
			parentResource.getUrl = sinon.stub().returns('http://test.com');

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.requestResource.calledOnce.should.be.eql(true);
				scraperContext.requestResource.args[0][0].url.should.be.eql('http://test.com/test.png');
			});
		});

		it('should call requestResource for each found source with correct params', function () {
			pathContainer.getPaths.returns(['a.jpg', 'b.jpg', 'c.jpg']);
			parentResource.getUrl = sinon.stub().returns('http://test.com');

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.requestResource.calledThrice.should.be.eql(true);
				scraperContext.requestResource.args[0][0].url.should.be.eql('http://test.com/a.jpg');
				scraperContext.requestResource.args[1][0].url.should.be.eql('http://test.com/b.jpg');
				scraperContext.requestResource.args[2][0].url.should.be.eql('http://test.com/c.jpg');
			});
		});

		it('should call loadResource with resource returned by requestResource', function () {
			pathContainer.getPaths.returns(['http://example.com/child']);

			var childResourceRespondedMock = new Resource('http://example.com/child', 'child.png');
			scraperContext.requestResource.resolves(childResourceRespondedMock);

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.loadResource.calledOnce.should.be.eql(true);
				scraperContext.loadResource.args[0][0].should.be.eql(childResourceRespondedMock);
			});
		});

		it('should update paths in text with local files returned by requestResource', function () {
			pathContainer.getPaths.returns([
				'http://first.com/img/a.jpg',
				'http://first.com/b.jpg',
				'http://second.com/img/c.jpg'
			]);

			scraperContext.requestResource.onFirstCall().resolves(new Resource('http://first.com/img/a.jpg', 'local/a.jpg'));
			scraperContext.requestResource.onSecondCall().resolves(new Resource('http://first.com/b.jpg', 'local/b.jpg'));
			scraperContext.requestResource.onThirdCall().resolves(new Resource('http://second.com/img/c.jpg', 'local/c.jpg'));

			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
				var updateTextStub = pathContainer.updateText;
				updateTextStub.calledOnce.should.be.eql(true);
				updateTextStub.args[0][0].length.should.be.eql(3);
				updateTextStub.args[0][0].should.containEql({
					oldPath: 'http://first.com/img/a.jpg',
					newPath: 'local/a.jpg'
				});
				updateTextStub.args[0][0].should.containEql({
					oldPath: 'http://first.com/b.jpg',
					newPath: 'local/b.jpg'
				});
				updateTextStub.args[0][0].should.containEql({
					oldPath: 'http://second.com/img/c.jpg',
					newPath: 'local/c.jpg'
				});
				updateChildSpy.calledThrice.should.be.eql(true);
			});
		});

		it('should not update paths in text, for which requestResource returned null', function () {
			pathContainer.getPaths.returns([
				'http://first.com/img/a.jpg',
				'http://first.com/b.jpg',
				'http://second.com/img/c.jpg'
			]);

			scraperContext.requestResource.onFirstCall().resolves(null);
			scraperContext.requestResource.onSecondCall().resolves(null);
			scraperContext.requestResource.onThirdCall().resolves(new Resource('http://second.com/img/c.jpg', 'local/c.jpg'));

			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
				var updateTextStub = pathContainer.updateText;
				updateTextStub.calledOnce.should.be.eql(true);
				updateTextStub.args[0][0].length.should.be.eql(1);
				updateTextStub.args[0][0].should.containEql({
					oldPath: 'http://second.com/img/c.jpg',
					newPath: 'local/c.jpg'
				});
				updateChildSpy.calledOnce.should.be.eql(true);
			});
		});

		it('should wait for all children promises fulfilled and then return updated text', function () {
			pathContainer.getPaths.returns([
				'http://first.com/img/a.jpg',
				'http://first.com/b.jpg',
				'http://second.com/img/c.jpg'
			]);

			pathContainer.updateText.returns('UPDATED TEXT');

			scraperContext.requestResource.onFirstCall().resolves(new Resource('http://first.com/img/a.jpg', 'local/a.jpg'));
			scraperContext.requestResource.onSecondCall().resolves(null);
			scraperContext.requestResource.onThirdCall().rejects(new Error('some error'));

			return resHandler.handleChildrenResources(pathContainer, parentResource).then(function (updatedText) {
				updatedText.should.be.eql('UPDATED TEXT');
			});
		});

		describe('hash in urls', function () {
			it('should keep hash in url for html resources', function () {
				var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
				sinon.stub(resourceStub, 'getType').returns('html');
				scraperContext.requestResource.onFirstCall().resolves(resourceStub);

				pathContainer.getPaths.returns(['http://example.com/page1.html#hash']);

				return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
					var updateTextStub = pathContainer.updateText;
					updateTextStub.calledOnce.should.be.eql(true);
					updateTextStub.args[0][0].length.should.be.eql(1);
					updateTextStub.args[0][0].should.containEql({
						oldPath: 'http://example.com/page1.html#hash',
						newPath: 'local/page1.html#hash'
					});
				});
			});

			it('should remove hash from url for not-html resources', function () {
				var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
				sinon.stub(resourceStub, 'getType').returns('other');
				scraperContext.requestResource.onFirstCall().resolves(resourceStub);

				pathContainer.getPaths.returns(['http://example.com/page1.html#hash']);

				return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
					var updateTextStub = pathContainer.updateText;
					updateTextStub.calledOnce.should.be.eql(true);
					updateTextStub.args[0][0].length.should.be.eql(1);
					updateTextStub.args[0][0].should.containEql({
						oldPath: 'http://example.com/page1.html#hash',
						newPath: 'local/page1.html'
					});
				});
			});
		});

		describe('prettifyUrls', function () {
			it('should not prettifyUrls by default', function() {
				var resourceStub = new Resource('http://example.com/other-page/index.html', 'other-page/index.html');
				scraperContext.requestResource.onFirstCall().resolves(resourceStub);

				pathContainer.getPaths.returns(['http://example.com/other-page/index.html']);


				return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
					var updateTextStub = pathContainer.updateText;
					updateTextStub.calledOnce.should.be.eql(true);
					updateTextStub.args[0][0].length.should.be.eql(1);
					updateTextStub.args[0][0].should.containEql({
						oldPath: 'http://example.com/other-page/index.html',
						newPath: 'other-page/index.html'
					});
				});
			});

			it('should prettifyUrls if specified', function() {
				var resourceStub = new Resource('http://example.com/other-page/index.html', 'other-page/index.html');
				scraperContext.requestResource.onFirstCall().resolves(resourceStub);

				pathContainer.getPaths.returns(['http://example.com/other-page/index.html']);
				resHandler.options.prettifyUrls = true;

				return resHandler.handleChildrenResources(pathContainer, parentResource).then(function () {
					var updateTextStub = pathContainer.updateText;
					updateTextStub.calledOnce.should.be.eql(true);
					updateTextStub.args[0][0].length.should.be.eql(1);
					updateTextStub.args[0][0].should.containEql({
						oldPath: 'http://example.com/other-page/index.html',
						newPath: 'other-page/'
					});
				});
			});
		});
	});

});
