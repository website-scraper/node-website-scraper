'use strict';

const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const proxyquire = require('proxyquire');
const path = require('path');
const Resource = require('../../../lib/resource');
const ResourceHandler = require('../../../lib/resource-handler');

describe('ResourceHandler', function() {
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

		it('should init specific resource handlers', function() {
			var htmlHandlerStub = sinon.stub();
			var cssHandlerStub = sinon.stub();

			var ResourceHandler = proxyquire('../../../lib/resource-handler', {
				'./html': htmlHandlerStub,
				'./css': cssHandlerStub
			});

			var handleChildResStub = sinon.stub(ResourceHandler.prototype, 'downloadChildrenResources').usingPromise(Promise).resolves();
			var options = { defaultFilename: 'test' };
			var context = { dummy: 'context' };

			var resHandler = new ResourceHandler(options, context);
			should.exist(resHandler.htmlHandler);
			should.exist(resHandler.cssHandler);

			handleChildResStub.called.should.be.eql(false);

			htmlHandlerStub.calledOnce.should.be.eql(true);
			htmlHandlerStub.args[0][0].should.be.eql(options);
			htmlHandlerStub.args[0][1].downloadChildrenPaths();
			handleChildResStub.calledOnce.should.be.eql(true);

			cssHandlerStub.calledOnce.should.be.eql(true);
			cssHandlerStub.args[0][0].should.be.eql(options);
			cssHandlerStub.args[0][1].downloadChildrenPaths();
			handleChildResStub.calledTwice.should.be.eql(true);

			handleChildResStub.restore();
		});
	});

	describe('#getResourceHandler', () => {
		var resourceHandler;

		beforeEach(function() {
			resourceHandler = new ResourceHandler({});
		});

		it('should return css handler if file has css type', function() {
			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('css');

			var specificResourceHandler = resourceHandler.getResourceHandler(r);
			specificResourceHandler.should.be.eql(resourceHandler.cssHandler);
		});

		it('should return html handler if file has html type', function() {
			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('html');

			var specificResourceHandler = resourceHandler.getResourceHandler(r);
			specificResourceHandler.should.be.eql(resourceHandler.htmlHandler);
		});

		it('should return null if file has other type', function() {
			var r = new Resource('http://example.com/');
			sinon.stub(r, 'getType').returns('other');

			var specificResourceHandler = resourceHandler.getResourceHandler(r);
			should(specificResourceHandler).be.eql(null);
		});
	});

	describe('#handleResource', () => {
		var resHandler;

		beforeEach(function() {
			var options = { defaultFilename: 'test' };
			var context = {
				requestResource: sinon.stub().resolves(),
				loadResource: sinon.stub().resolves()
			};
			resHandler = new ResourceHandler(options, context);
		});

		it('should call getResourceHandler and execute specific resource handler', function() {
			var specificResourceHandleStub = sinon.stub().resolves();
			resHandler.getResourceHandler = sinon.stub().returns({
				handle: specificResourceHandleStub
			});

			var r = new Resource('http://example.com');
			return resHandler.handleResource(r).then(function() {
				specificResourceHandleStub.args[0][0].should.be.eql(r);
			});
		});

		it('should call getResourceHandler and return resolved promise if no specific handler found', function() {
			resHandler.getResourceHandler = sinon.stub().returns(null);

			var r = new Resource('http://example.com');
			return resHandler.handleResource(r).then(function(returnedResource) {
				should(returnedResource).be.eql(r);
			});
		});
	});

	describe('#downloadChildrenResources', () => {
		let pathContainer, parentResource, scraperContext, resHandler;

		beforeEach(() => {
			pathContainer = {};
			pathContainer.getPaths = sinon.stub();
			pathContainer.updateText = sinon.stub();

			parentResource = new Resource('http://example.com', 'test.txt');

			scraperContext = {
				requestResource: sinon.stub().returns(Promise.resolve()),
				loadResource: sinon.stub().returns(Promise.resolve())
			};

			resHandler = new ResourceHandler({defaultFilename: 'index.html'}, scraperContext);
		});

		it('should not call requestResource if no paths in text', () => {
			pathContainer.getPaths = sinon.stub().returns([]);

			return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.requestResource.called.should.be.eql(false);
			});
		});

		it('should call requestResource once with correct params', () => {
			pathContainer.getPaths.returns(['test.png']);
			parentResource.getUrl = sinon.stub().returns('http://test.com');

			return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.requestResource.calledOnce.should.be.eql(true);
				scraperContext.requestResource.args[0][0].url.should.be.eql('http://test.com/test.png');
			});
		});

		it('should call requestResource for each found source with correct params', () => {
			pathContainer.getPaths.returns(['a.jpg', 'b.jpg', 'c.jpg']);
			parentResource.getUrl = sinon.stub().returns('http://test.com');

			return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
				scraperContext.requestResource.calledThrice.should.be.eql(true);
				scraperContext.requestResource.args[0][0].url.should.be.eql('http://test.com/a.jpg');
				scraperContext.requestResource.args[1][0].url.should.be.eql('http://test.com/b.jpg');
				scraperContext.requestResource.args[2][0].url.should.be.eql('http://test.com/c.jpg');
			});
		});

		it('should update paths in text with local files returned by requestResource', () => {
			pathContainer.getPaths.returns([
				'http://first.com/img/a.jpg',
				'http://first.com/b.jpg',
				'http://second.com/img/c.jpg',
				'http://second.com/d',
			]);

			scraperContext.requestResource.onCall(0).returns(Promise.resolve(new Resource('http://first.com/img/a.jpg', 'local' + path.sep + 'a.jpg')));
			scraperContext.requestResource.onCall(1).returns(Promise.resolve(new Resource('http://first.com/b.jpg', 'local' + path.sep + 'b.jpg')));
			scraperContext.requestResource.onCall(2).returns(Promise.resolve(new Resource('http://second.com/img/c.jpg', 'local' + path.sep + 'c.jpg')));
			scraperContext.requestResource.onCall(3).returns(Promise.resolve(new Resource('http://second.com/d', 'a%b' + path.sep + '"\'( )?p=q&\\#')));

			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
				var updateTextStub = pathContainer.updateText;
				updateTextStub.calledOnce.should.be.eql(true);
				updateTextStub.args[0][0].length.should.be.eql(4);
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
				updateTextStub.args[0][0].should.containEql({
					oldPath: 'http://second.com/d',
					newPath: 'a%25b/%22%27%28%20%29%3Fp%3Dq%26' + (path.sep === '\\' ? '/' : '%5C') + '%23'
				});
				updateChildSpy.callCount.should.be.eql(4);
			});
		});

		it('should not update paths in text, for which requestResource returned null', () => {
			pathContainer.getPaths.returns([
				'http://first.com/img/a.jpg',
				'http://first.com/b.jpg',
				'http://second.com/img/c.jpg'
			]);

			scraperContext.requestResource.onFirstCall().returns(Promise.resolve(null));
			scraperContext.requestResource.onSecondCall().returns(Promise.resolve(null));
			scraperContext.requestResource.onThirdCall().returns(Promise.resolve(new Resource('http://second.com/img/c.jpg', 'local/c.jpg')));

			var updateChildSpy = sinon.spy(parentResource, 'updateChild');

			return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
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

		it('should wait for all children promises fulfilled and then return updated text', () => {
			pathContainer.getPaths.returns([
				'http://first.com/img/a.jpg',
				'http://first.com/b.jpg',
				'http://second.com/img/c.jpg'
			]);

			pathContainer.updateText.returns('UPDATED TEXT');

			scraperContext.requestResource.onFirstCall().returns(Promise.resolve(new Resource('http://first.com/img/a.jpg', 'local/a.jpg')));
			scraperContext.requestResource.onSecondCall().returns(Promise.resolve(null));
			scraperContext.requestResource.onThirdCall().returns(Promise.reject(new Error('some error')));

			return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function (updatedText) {
				updatedText.should.be.eql('UPDATED TEXT');
			});
		});

		describe('hash in urls', () => {
			it('should keep hash in urls', function () {
				var resourceStub = new Resource('http://example.com/page1.html', 'local/page1.html');
				sinon.stub(resourceStub, 'getType').returns('html');
				scraperContext.requestResource.onFirstCall().returns(Promise.resolve(resourceStub));

				pathContainer.getPaths.returns(['http://example.com/page1.html#hash']);

				return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
					var updateTextStub = pathContainer.updateText;
					updateTextStub.calledOnce.should.be.eql(true);
					updateTextStub.args[0][0].length.should.be.eql(1);
					updateTextStub.args[0][0].should.containEql({
						oldPath: 'http://example.com/page1.html#hash',
						newPath: 'local/page1.html#hash'
					});
				});
			});
		});

		describe('prettifyUrls', () => {
			it('should not prettifyUrls by default', function() {
				var resourceStub = new Resource('http://example.com/other-page/index.html', 'other-page/index.html');
				scraperContext.requestResource.onFirstCall().returns(Promise.resolve(resourceStub));

				pathContainer.getPaths.returns(['http://example.com/other-page/index.html']);


				return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
					var updateTextStub = pathContainer.updateText;
					updateTextStub.calledOnce.should.be.eql(true);
					updateTextStub.args[0][0].length.should.be.eql(1);
					updateTextStub.args[0][0].should.containEql({
						oldPath: 'http://example.com/other-page/index.html',
						newPath: 'other-page/index.html'
					});
				});
			});

			it('should prettifyUrls if specified', () => {
				var resourceStub = new Resource('http://example.com/other-page/index.html', 'other-page/index.html');
				scraperContext.requestResource.onFirstCall().returns(Promise.resolve(resourceStub));

				pathContainer.getPaths.returns(['http://example.com/other-page/index.html']);
				resHandler.options.prettifyUrls = true;

				return resHandler.downloadChildrenResources(pathContainer, parentResource).then(function () {
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

		describe('updateMissingSources', () => {
			beforeEach(() => {
				pathContainer.getPaths.returns([
					'/success.png',
					'/failed.png'
				]);
				scraperContext.requestResource.onFirstCall().returns(Promise.resolve(new Resource('http://example.com/success.png', 'local/success.png')));
				scraperContext.requestResource.onSecondCall().returns(Promise.resolve(null));
			});

			it('should update missing path with absolute url if updateIfFailed = true', () => {
				const updateIfFailed = true;

				return resHandler.downloadChildrenResources(pathContainer, parentResource, updateIfFailed).then(() => {
					pathContainer.updateText.calledOnce.should.be.eql(true);
					pathContainer.updateText.args[0][0].length.should.be.eql(2);
					pathContainer.updateText.args[0][0].should.containEql({
						oldPath: '/success.png',
						newPath: 'local/success.png'
					});
					pathContainer.updateText.args[0][0].should.containEql({
						oldPath: '/failed.png',
						newPath: 'http://example.com/failed.png'
					});
				});
			});

			it('should not update missing path with absolute url if updateIfFailed = false', () => {
				const updateIfFailed = false;

				return resHandler.downloadChildrenResources(pathContainer, parentResource, updateIfFailed).then(() => {
					pathContainer.updateText.calledOnce.should.be.eql(true);
					pathContainer.updateText.args[0][0].length.should.be.eql(1);
					pathContainer.updateText.args[0][0].should.containEql({
						oldPath: '/success.png',
						newPath: 'local/success.png'
					});
				});
			})
		});
	});

	describe('#updateChildrenResources', () => {
		describe('updateMissingSources', () => {
			let pathContainer, parentResource, resHandler;

			beforeEach(() => {
				pathContainer = {};
				pathContainer.getPaths = sinon.stub().returns([
					'/failed1.png',
					'/failed2.png'
				]);
				pathContainer.updateText = sinon.stub();
				parentResource = new Resource('http://example.com', 'index.html');
				resHandler = new ResourceHandler({});
			});

			it('should update all paths with absolute urls if updateIfFailed = true', () => {
				const updateIfFailed = true;

				return resHandler.updateChildrenResources(pathContainer, parentResource, updateIfFailed).then(() => {
					pathContainer.updateText.calledOnce.should.be.eql(true);
					pathContainer.updateText.args[0][0].length.should.be.eql(2);
					pathContainer.updateText.args[0][0].should.containEql({
						oldPath: '/failed1.png',
						newPath: 'http://example.com/failed1.png'
					});
					pathContainer.updateText.args[0][0].should.containEql({
						oldPath: '/failed2.png',
						newPath: 'http://example.com/failed2.png'
					});
				});
			});

			it('should not update paths if updateIfFailed = false', () => {
				const updateIfFailed = false;

				return resHandler.updateChildrenResources(pathContainer, parentResource, updateIfFailed).then(() => {
					pathContainer.updateText.calledOnce.should.be.eql(true);
					pathContainer.updateText.args[0][0].length.should.be.eql(0);
				});
			})
		});

	});
});
