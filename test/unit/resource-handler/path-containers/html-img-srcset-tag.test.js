var should = require('should');
var HtmlImgSrcSetTag = require('../../../../lib/resource-handler/path-containers/html-img-srcset-tag');

describe('PathsContainer: HtmlImgSrcSetTag', function () {

	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			var htmlImgSrcSetTag = new HtmlImgSrcSetTag();
			should(htmlImgSrcSetTag.text).be.eql('');
		});
	});

	describe('#getPaths', function () {
		it('should return paths from srcset', function () {
			var text = 'image150.jpg 150w, image45.jpg 45w';
			var htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			var resultPaths = htmlImgSrcSetTag.getPaths();
			should(resultPaths).containEql('image150.jpg');
			should(resultPaths).containEql('image45.jpg');
		});
	});

	describe('#updateText', function () {
		it('should update paths in text', function () {
			var text = 'image150.jpg 150w, image45.jpg 45w';
			var htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			var actualResultText = htmlImgSrcSetTag.updateText([
				{ oldPath: 'image150.jpg', newPath: 'images/150.jpg' },
				{ oldPath: 'image45.jpg', newPath: 'images/45.jpg' }
			]);
			var expectedResultText = 'images/150.jpg 150w, images/45.jpg 45w';
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update all duplicated paths in text', function() {
			var text = 'image.jpg 150w, image.jpg 45w';
			var htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			var actualResultText = htmlImgSrcSetTag.updateText([
				{ oldPath: 'image.jpg', newPath: 'newImage.jpg' }
			]);
			var expectedResultText = 'newImage.jpg 150w, newImage.jpg 45w';
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update only specified paths', function () {
			var text = 'image150.jpg 150w, image45.jpg 45w';
			var htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			var actualResultText = htmlImgSrcSetTag.updateText([
				{ oldPath: 'image150.jpg', newPath: 'images/150.jpg' }
			]);
			var expectedResultText = 'images/150.jpg 150w, image45.jpg 45w';
			should(actualResultText).be.eql(expectedResultText);
		});
	});
});
