import * as chai from 'chai';
chai.should();
import HtmlCommonTag from '../../../../lib/resource-handler/path-containers/html-common-tag.js';

describe('PathsContainer: HtmlCommonTag', function () {

	describe('constructor', function() {
		it('should set text to empty string if nothing passed', function() {
			const htmlCommonTag = new HtmlCommonTag();
			htmlCommonTag.text.should.eql('');
		});
	});

	describe('#getPaths', function () {
		it('should return paths', function () {
			const text = 'image.jpg';
			const htmlCommonTag = new HtmlCommonTag(text);
			const resultPaths = htmlCommonTag.getPaths();
			resultPaths.should.contain('image.jpg');
		});

		it('should not return path with same-page id', function() {
			const text = '#top';
			const htmlCommonTag = new HtmlCommonTag(text);
			const resultPaths = htmlCommonTag.getPaths();
			resultPaths.should.be.instanceOf(Array).and.have.length(0);
		});

		it('should return path with other-page id', function() {
			const text = 'other.html#top';
			const htmlCommonTag = new HtmlCommonTag(text);
			const resultPaths = htmlCommonTag.getPaths();
			resultPaths.should.contain('other.html#top');
		});

		it('should not return path is uri schema is not supported (mailto: skype: etc)', function() {
			const text1 = 'mailto:sophie@example.com';
			const resultPaths1 = new HtmlCommonTag(text1).getPaths();
			resultPaths1.should.be.instanceOf(Array).and.have.length(0);

			const text2 = 'skype:profile_name';
			const resultPaths2 = new HtmlCommonTag(text2).getPaths();
			resultPaths2.should.be.instanceOf(Array).and.have.length(0);

			const text3 = 'javascript:alert("Hello World!");';
			const resultPaths3 = new HtmlCommonTag(text3).getPaths();
			resultPaths3.should.be.instanceOf(Array).and.have.length(0);
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
			actualResultText.should.eql(expectedResultText);
		});
	});
});
