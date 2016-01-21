require('should');

var Resource = require('../../lib/resource');
var types = require('../../lib/config/resource-types');

describe('Resource', function() {
	describe('#getType', function() {
		it('should return correct type based on extension', function() {
			var html = new Resource('http://example.com', 'index.html');
			var htm = new Resource('http://example.com', 'index.htm');
			var css = new Resource('http://example.com/style.css', 'style.css');
			var img = new Resource('http://example.com/img/logo.png', 'logo.png');

			html.getType().should.be.eql(types.html);
			htm.getType().should.be.eql(types.html);
			css.getType().should.be.eql(types.css);
			img.getType().should.be.eql(types.other);
		});

		it('should return other if resource has no extension', function() {
			var unknown = new Resource('http://example.com/smthelse');
			unknown.getType().should.be.eql(types.other);
		});

		it('should return css if resource has no extension and parent is css', function() {
			var css = new Resource('http://example.com/style.css', 'style.css');
			var res = new Resource('http://example.com/some-resource');
			res.setParent(css);
			res.getType().should.be.eql(types.css);
		});

		it('should return css if resource has no extension and parent is html and resource is loading from link tag', function() {
			var html = new Resource('http://example.com', 'index.html');
			var res = new Resource('http://example.com/some-resource');
			res.setParent(html);
			res.setHtmlData({ tagName: 'link', attributeName: 'href' });
			res.getType().should.be.eql(types.css);
		});

		it('should return html if resource has no extension and parent is html and resource is loading from a tag', function() {
			var html = new Resource('http://example.com', 'index.html');
			var res = new Resource('http://example.com/some-resource');
			res.setParent(html);
			res.setHtmlData({ tagName: 'a', attributeName: 'href' });
			res.getType().should.be.eql(types.html);
		});

		it('should return html if resource has no extension and parent is html and resource is loading from iframe tag', function() {
			var html = new Resource('http://example.com', 'index.html');
			var res = new Resource('http://example.com/some-resource');
			res.setParent(html);
			res.setHtmlData({ tagName: 'iframe', attributeName: 'src' });
			res.getType().should.be.eql(types.html);
		});

		it('should return other if resource has no extension and parent is html and resource has no html tag', function() {
			var html = new Resource('http://example.com', 'index.html');
			var res = new Resource('http://example.com/some-resource');
			res.setParent(html);
			res.getType().should.be.eql(types.other);
		});

		it('should return other if resource has no extension and parent is html and html tag doesn\'t load html or css ', function() {
			var html = new Resource('http://example.com', 'index.html');
			var res = new Resource('http://example.com/some-resource');
			res.setParent(html);
			res.setHtmlData({ tagName: 'img', attributeName: 'src' });
			res.getType().should.be.eql(types.other);
		});
	});

	describe('#setDepth', function () {
		it('should set depth', function() {
			var o = new Resource('http://google.com');
			o.setDepth(555);
			o.depth.should.be.eql(555);
		});
	});

	describe('#getDepth', function () {
		it('should return depth if object has it', function() {
			var o = new Resource('http://google.com');
			o.setDepth(123);
			o.getDepth().should.be.eql(123);
		});

		it('should return 0 if object has no depth', function() {
			var o = new Resource('http://google.com');
			o.getDepth().should.be.eql(0);
		});

	});

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
			child.getFilename().should.be.eql('google.html');
		});

		it('should set parent', function() {
			var parent = new Resource('http://example.com');
			var child = parent.createChild('http://google.com');
			child.parent.should.be.equal(parent);
		});

		it('should set depth', function() {
			var parent = new Resource('http://example.com');
			var child = parent.createChild('http://google.com');
			child.getDepth().should.be.eql(1);

			var childOfChild = child.createChild('http://google.com.ua');
			childOfChild.getDepth().should.be.eql(2);
		});
	});
});
