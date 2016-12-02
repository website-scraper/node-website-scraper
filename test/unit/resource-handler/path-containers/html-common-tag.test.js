var should = require('should');
var HtmlCommonTag = require('../../../../lib/resource-handler/path-containers/html-common-tag');

describe('PathsContainer: HtmlCommonTag', function () {

	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			var htmlCommonTag = new HtmlCommonTag();
			should(htmlCommonTag.text).be.eql('');
		});
	});

	describe('#getPaths', function () {
		it('should return paths', function () {
			var text = 'image.jpg';
			var htmlCommonTag = new HtmlCommonTag(text);
			var resultPaths = htmlCommonTag.getPaths();
			should(resultPaths).containEql('image.jpg');
		});

		it('should not return path with same-page id', function() {
			var text = '#top';
			var htmlCommonTag = new HtmlCommonTag(text);
			var resultPaths = htmlCommonTag.getPaths();
			should(resultPaths).be.instanceOf(Array).and.have.length(0);
		});

		it('should return path with other-page id', function() {
			var text = 'other.html#top';
			var htmlCommonTag = new HtmlCommonTag(text);
			var resultPaths = htmlCommonTag.getPaths();
			should(resultPaths).containEql('other.html#top');
		});
	});

	describe('#updateText', function () {
		it('should update paths in text', function () {
			var text = 'image.jpg';
			var htmlCommonTag = new HtmlCommonTag(text);
			var actualResultText = htmlCommonTag.updateText([
				{ oldPath: 'image.jpg', newPath: 'images/image.jpg' }
			]);
			var expectedResultText = 'images/image.jpg';
			should(actualResultText).be.eql(expectedResultText);
		});
	});
});
