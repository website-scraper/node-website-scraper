import 'should';
import Resource from '../../lib/resource.js';

describe('Resource', function() {
	describe('#createChild', function () {
		it('should return Resource', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.should.be.instanceOf(Resource);
		});

		it('should set correct url and filename', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com', 'google.html');
			child.getUrl().should.be.eql('http://google.com');
			child.getFilename().should.equalFileSystemPath('google.html');
		});

		it('should set parent', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.parent.should.be.equal(parent);
		});

		it('should set depth', function() {
			const parent = new Resource('http://example.com');
			const child = parent.createChild('http://google.com');
			child.depth.should.be.eql(1);

			const childOfChild = child.createChild('http://google.com.ua');
			childOfChild.depth.should.be.eql(2);
		});
	});
});
