require('should');

var PageObject = require('../lib/page-object');

describe('PageObject', function() {
	describe('#PageObject', function() {
		it('should return correct type of object', function() {
			var html = new PageObject('http://example.com', 'index.html');
			var css = new PageObject('http://example.com/style.css', 'style.css');
			var img = new PageObject('http://example.com/img/logo.png', 'logo.png');
			var unknown = new PageObject('http://example.com/smthelse');

			html.getType().should.be.eql('html');
			css.getType().should.be.eql('css');
			img.getType().should.be.eql('other');
			unknown.getType().should.be.eql('other');
		});
	});
});
