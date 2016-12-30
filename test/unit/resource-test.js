require('should');
var Resource = require('../../lib/resource');

describe('Resource', function() {
	describe('#createChild', function () {
		it('should return Resource', function() {
			var parent = new Resource('http://example.com');
			var child = parent.createChild('http://google.com');
			child.should.be.instanceOf(Resource);
		});

		it('should set correct url and filename', function() {
			var parent = new Resource('http://example.com');
			var child = parent.createChild('http://google.com', 'google.html');
			child.getUrl().should.be.eql('http://google.com');
			child.getFilename().should.equalFileSystemPath('google.html');
		});

		it('should set parent', function() {
			var parent = new Resource('http://example.com');
			var child = parent.createChild('http://google.com');
			child.parent.should.be.equal(parent);
		});

		it('should set depth', function() {
			var parent = new Resource('http://example.com');
			var child = parent.createChild('http://google.com');
			child.depth.should.be.eql(1);

			var childOfChild = child.createChild('http://google.com.ua');
			childOfChild.depth.should.be.eql(2);
		});
	});
});
