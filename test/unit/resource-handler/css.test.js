import should from 'should';
import sinon from 'sinon';
import Resource from '../../../lib/resource.js';
import CssResourceHandler from '../../../lib/resource-handler/css/index.js';

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
