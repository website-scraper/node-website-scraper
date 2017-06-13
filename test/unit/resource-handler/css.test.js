'use strict';

const should = require('should');
const sinon = require('sinon');
const Resource = require('../../../lib/resource');
const CssResourceHandler = require('../../../lib/resource-handler/css');

describe('ResourceHandler: Css', () => {
	it('should call downloadChildrenResources and set returned text to resource', () => {
		const downloadChildrenPaths = sinon.stub().resolves('updated text');

		const originalResource = new Resource('http://example.com');
		const cssHandler = new CssResourceHandler({}, {downloadChildrenPaths});

		return cssHandler.handle(originalResource).then((updatedResource) => {
			should(updatedResource).be.equal(originalResource);
			should(updatedResource.getText()).be.eql('updated text');
		});
	});
});
