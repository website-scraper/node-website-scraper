import * as chai from 'chai';
chai.should();
import CssText from '../../../../lib/resource-handler/path-containers/css-text.js';

describe('PathsContainer: CssText', function () {
	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			const cssText = new CssText();
			cssText.text.should.eql('');
		});
	});

	describe('#getPaths', function() {
		it('should return paths from url()', function() {
			const text = `
				.a {background: url(a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			const cssText = new CssText(text);
			const resultPaths = cssText.getPaths();
			resultPaths.should.contain('a.jpg');
			resultPaths.should.contain('b.jpg');
			resultPaths.should.contain('c.jpg');
		});

		it('should return paths from @import', function() {
			const text = `
				@import "style1.css";
				@import 'style2.css';
			`;
			const cssText = new CssText(text);
			const resultPaths = cssText.getPaths();
			resultPaths.should.contain('style1.css');
			resultPaths.should.contain('style2.css');
		});

		it('should return paths from @import url()', function() {
			const text = `
				@import url("style1.css");
				@import url('style2.css');
			`;
			const cssText = new CssText(text);
			const resultPaths = cssText.getPaths();
			resultPaths.should.contain('style1.css');
			resultPaths.should.contain('style2.css');
		});
	});

	describe('#updateText', function() {
		it('should update paths in text', function() {
			const text = `
				.a {background: url(a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			const cssText = new CssText(text);
			const actualResultText = cssText.updateText([
				{ oldPath: 'a.jpg', newPath: 'images/a.jpg' },
				{ oldPath: 'b.jpg', newPath: 'images/b.jpg' },
				{ oldPath: 'c.jpg', newPath: 'images/c.jpg' }
			]);
			const expectedResultText = `
				.a {background: url(images/a.jpg)} 
				.b {background: url('images/b.jpg')}
				.c {background: url("images/c.jpg")}
			`;
			actualResultText.should.eql(expectedResultText);
		});

		it('should update all duplicated paths in text', function() {
			const text = `
				.a {background: url(img.jpg)} 
				.b {background: url('img.jpg')}
				.c {background: url("img.jpg")}
			`;
			const cssText = new CssText(text);
			const actualResultText = cssText.updateText([
				{ oldPath: 'img.jpg', newPath: 'newImg.jpg' }
			]);
			const expectedResultText = `
				.a {background: url(newImg.jpg)} 
				.b {background: url('newImg.jpg')}
				.c {background: url("newImg.jpg")}
			`;
			actualResultText.should.eql(expectedResultText);
		});

		it('should update only completely equal paths (should not update partially matched)', function() {
			const text = `
				@import "style.css"; 
				@import 'mystyle.css';
				@import url('another-style.css');
			`;
			const cssText = new CssText(text);
			const actualResultText = cssText.updateText([
				{ oldPath: 'style.css', newPath: 'local/style.css' }
			]);
			const expectedResultText = `
				@import "local/style.css"; 
				@import 'mystyle.css';
				@import url('another-style.css');
			`;
			actualResultText.should.eql(expectedResultText);
		});

		it('should update only specified paths', function() {
			const text = `
				.a {background: url(a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			const cssText = new CssText(text);
			const actualResultText = cssText.updateText([
				{ oldPath: 'a.jpg', newPath: 'images/a.jpg' }
			]);
			const expectedResultText = `
				.a {background: url(images/a.jpg)} 
				.b {background: url('b.jpg')}
				.c {background: url("c.jpg")}
			`;
			actualResultText.should.eql(expectedResultText);
		});
	});
});
