var should = require('should');
var CssText = require('../../../../lib/resource-handler/path-containers/css-text');

describe('PathsContainer: CssText', function () {
	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			var cssText = new CssText();
			should(cssText.text).be.eql('');
		});
	});

	describe('#getPaths', function() {
		it('should return paths from url()', function() {
			var text = `
				.a {background: url(a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			var cssText = new CssText(text);
			var resultPaths = cssText.getPaths();
			should(resultPaths).containEql('a.jpg');
			should(resultPaths).containEql('b.jpg');
			should(resultPaths).containEql('c.jpg');
		});

		it('should return paths from @import', function() {
			var text = `
				@import "style1.css";
				@import 'style2.css';
			`;
			var cssText = new CssText(text);
			var resultPaths = cssText.getPaths();
			should(resultPaths).containEql('style1.css');
			should(resultPaths).containEql('style2.css');
		});

		it('should return paths from @import url()', function() {
			var text = `
				@import url("style1.css");
				@import url('style2.css');
			`;
			var cssText = new CssText(text);
			var resultPaths = cssText.getPaths();
			should(resultPaths).containEql('style1.css');
			should(resultPaths).containEql('style2.css');
		});
	});

	describe('#updateText', function() {
		it('should update paths in text', function() {
			var text = `
				.a {background: url(a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			var cssText = new CssText(text);
			var actualResultText = cssText.updateText([
				{ oldPath: 'a.jpg', newPath: 'images/a.jpg' },
				{ oldPath: 'b.jpg', newPath: 'images/b.jpg' },
				{ oldPath: 'c.jpg', newPath: 'images/c.jpg' }
			]);
			var expectedResultText = `
				.a {background: url(images/a.jpg)} 
				.b {background: url('images/b.jpg')}
				.c {background: url("images/c.jpg")}
			`;
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update all duplicated paths in text', function() {
			var text = `
				.a {background: url(img.jpg)} 
				.b {background: url('img.jpg')}
				.c {background: url("img.jpg")}
			`;
			var cssText = new CssText(text);
			var actualResultText = cssText.updateText([
				{ oldPath: 'img.jpg', newPath: 'newImg.jpg' }
			]);
			var expectedResultText = `
				.a {background: url(newImg.jpg)} 
				.b {background: url('newImg.jpg')}
				.c {background: url("newImg.jpg")}
			`;
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update only completely equal paths (should not update partially matched)', function() {
			var text = `
				@import "style.css"; 
				@import 'mystyle.css';
				@import url('another-style.css');
			`;
			var cssText = new CssText(text);
			var actualResultText = cssText.updateText([
				{ oldPath: 'style.css', newPath: 'local/style.css' }
			]);
			var expectedResultText = `
				@import "local/style.css"; 
				@import 'mystyle.css';
				@import url('another-style.css');
			`;
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update only specified paths', function() {
			var text = `
				.a {background: url(a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			var cssText = new CssText(text);
			var actualResultText = cssText.updateText([
				{ oldPath: 'a.jpg', newPath: 'images/a.jpg' }
			]);
			var expectedResultText = `
				.a {background: url(images/a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			should(actualResultText).be.eql(expectedResultText);
		});
	});
});
