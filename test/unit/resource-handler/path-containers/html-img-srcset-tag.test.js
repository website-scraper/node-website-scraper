import should from 'should';
import HtmlImgSrcSetTag from '../../../../lib/resource-handler/path-containers/html-img-srcset-tag.js';

describe('PathsContainer: HtmlImgSrcSetTag', function () {

	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			const htmlImgSrcSetTag = new HtmlImgSrcSetTag();
			should(htmlImgSrcSetTag.text).be.eql('');
		});
	});

	describe('#getPaths', function () {
		it('should return paths from srcset', function () {
			const text = 'image150.jpg 150w, image45.jpg 45w';
			const htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			const resultPaths = htmlImgSrcSetTag.getPaths();
			should(resultPaths).containEql('image150.jpg');
			should(resultPaths).containEql('image45.jpg');
		});
	});

	describe('#updateText', function () {
		it('should update paths in text', function () {
			const text = 'image150.jpg 150w, image45.jpg 45w';
			const htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			const actualResultText = htmlImgSrcSetTag.updateText([
				{ oldPath: 'image150.jpg', newPath: 'images/150.jpg' },
				{ oldPath: 'image45.jpg', newPath: 'images/45.jpg' }
			]);
			const expectedResultText = 'images/150.jpg 150w, images/45.jpg 45w';
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update all duplicated paths in text', function() {
			const text = 'image.jpg 150w, image.jpg 45w';
			const htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			const actualResultText = htmlImgSrcSetTag.updateText([
				{ oldPath: 'image.jpg', newPath: 'newImage.jpg' }
			]);
			const expectedResultText = 'newImage.jpg 150w, newImage.jpg 45w';
			should(actualResultText).be.eql(expectedResultText);
		});

		it('should update only specified paths', function () {
			const text = 'image150.jpg 150w, image45.jpg 45w';
			const htmlImgSrcSetTag = new HtmlImgSrcSetTag(text);
			const actualResultText = htmlImgSrcSetTag.updateText([
				{ oldPath: 'image150.jpg', newPath: 'images/150.jpg' }
			]);
			const expectedResultText = 'images/150.jpg 150w, image45.jpg 45w';
			should(actualResultText).be.eql(expectedResultText);
		});
	});
});
