import should from 'should';
import sinon from 'sinon';
import Resource from '../../../lib/resource.js';
import CssResourceHandler from '../../../lib/resource-handler/css/index.js';

describe('ResourceHandler: Css', () => {
	it('should call downloadChildrenResources and set returned text to resource', () => {
		const downloadChildrenPaths = sinon.stub().resolves('updated text');

		const originalResource = new Resource('http://example.com');
		originalResource.setText('original css text');
		const cssHandler = new CssResourceHandler({}, {downloadChildrenPaths});

		return cssHandler.handle(originalResource).then((updatedResource) => {
			should(updatedResource).be.equal(originalResource);
			should(updatedResource.getText()).be.eql('updated text');
		});
	});

	it('should update resource encoding if charset found', () => {
		const downloadChildrenPaths = sinon.stub().resolves('updated text');

		const originalResource = new Resource('http://example.com');
		originalResource.setText('@charset "UTF-8";');
		const cssHandler = new CssResourceHandler({}, {downloadChildrenPaths});

		return cssHandler.handle(originalResource).then((updatedResource) => {
			should(updatedResource).be.equal(originalResource);
			should(updatedResource.getEncoding()).be.eql('utf8');
		});
	});
});
