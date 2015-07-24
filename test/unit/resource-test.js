require('should');

var Resource = require('../../lib/resource');

describe('Resource', function() {
	describe('#Resource', function() {
		it('should return correct type of object', function() {
			var html = new Resource('http://example.com', 'index.html');
			var css = new Resource('http://example.com/style.css', 'style.css');
			var img = new Resource('http://example.com/img/logo.png', 'logo.png');
			var unknown = new Resource('http://example.com/smthelse');

			html.getType().should.be.eql('html');
			css.getType().should.be.eql('css');
			img.getType().should.be.eql('other');
			unknown.getType().should.be.eql('other');
		});
	});
});
