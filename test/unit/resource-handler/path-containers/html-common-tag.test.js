import should from 'should';
import HtmlCommonTag from '../../../../lib/resource-handler/path-containers/html-common-tag.js';

describe('PathsContainer: HtmlCommonTag', function () {

	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			const htmlCommonTag = new HtmlCommonTag();
			should(htmlCommonTag.text).be.eql('');
		});
	});

	describe('#getPaths', function () {
		it('should return paths', function () {
			const text = 'image.jpg';
			const htmlCommonTag = new HtmlCommonTag(text);
			const resultPaths = htmlCommonTag.getPaths();
			should(resultPaths).containEql('image.jpg');
		});

		it('should not return path with same-page id', function() {
			const text = '#top';
			const htmlCommonTag = new HtmlCommonTag(text);
			const resultPaths = htmlCommonTag.getPaths();
			should(resultPaths).be.instanceOf(Array).and.have.length(0);
		});

		it('should return path with other-page id', function() {
			const text = 'other.html#top';
			const htmlCommonTag = new HtmlCommonTag(text);
			const resultPaths = htmlCommonTag.getPaths();
			should(resultPaths).containEql('other.html#top');
		});

		it('should not return path is uri schema is not supported (mailto: skype: etc)', function() {
			const text1 = 'mailto:sophie@example.com';
			const resultPaths1 = new HtmlCommonTag(text1).getPaths();
			should(resultPaths1).be.instanceOf(Array).and.have.length(0);

			const text2 = 'skype:profile_name';
			const resultPaths2 = new HtmlCommonTag(text2).getPaths();
			should(resultPaths2).be.instanceOf(Array).and.have.length(0);

			const text3 = 'javascript:alert("Hello World!");';
			const resultPaths3 = new HtmlCommonTag(text3).getPaths();
			should(resultPaths3).be.instanceOf(Array).and.have.length(0);
		});
	});

	describe('#updateText', function () {
		it('should update paths in text', function () {
			const text = 'image.jpg';
			const htmlCommonTag = new HtmlCommonTag(text);
			const actualResultText = htmlCommonTag.updateText([
				{ oldPath: 'image.jpg', newPath: 'images/image.jpg' }
			]);
			const expectedResultText = 'images/image.jpg';
			should(actualResultText).be.eql(expectedResultText);
		});
	});
});
