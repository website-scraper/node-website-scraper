require('should');

var Resource = require('../../lib/resource');
var types = require('../../lib/config/resource-types');

describe('Resource', function() {
	describe('#Resource', function() {
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
});
