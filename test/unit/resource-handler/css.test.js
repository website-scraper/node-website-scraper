var should = require('should');
var Promise = require('bluebird');
var sinon = require('sinon');
require('sinon-as-promised')(Promise);
var Resource = require('../../../lib/resource');
var CssResourceHandler = require('../../../lib/resource-handler/css');

describe('ResourceHandler: Css', function () {
	it('should call handleChildrenResources and set returned text to resource', function() {
		var handleChildrenResources = sinon.stub().resolves('updated text');

		var originalResource = new Resource('http://example.com');
		var cssHandler = new CssResourceHandler({}, handleChildrenResources);

		return cssHandler.handle(originalResource).then(function (updatedResource) {
			should(updatedResource).be.equal(originalResource);
			should(updatedResource.getText()).be.eql('updated text');
		});
	});
});
