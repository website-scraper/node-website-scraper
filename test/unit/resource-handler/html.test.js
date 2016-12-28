require('should');
var Promise = require('bluebird');
var sinon = require('sinon');
require('sinon-as-promised')(Promise);
var Resource = require('../../../lib/resource');
var HtmlHandler = require('../../../lib/resource-handler/html');

var HtmlImgSrcsetTag = require('../../../lib/resource-handler/path-containers/html-img-srcset-tag');
var HtmlCommonTag = require('../../../lib/resource-handler/path-containers/html-common-tag');
var CssText = require('../../../lib/resource-handler/path-containers/css-text');

describe('ResourceHandler: Html', function () {
	var htmlHandler;

	beforeEach(function() {
		htmlHandler = new HtmlHandler({ sources: [] }, sinon.stub().resolves());
	});

	describe('<base> tag', function () {
		it('should remove base tag from text and update resource url for absolute href', function () {
			var html = `
				<html lang="en">
				<head>
					<base href="http://some-other-domain.com/src">
				</head>
				<body></body> 
				</html>
			`;
			var resource = new Resource('http://example.com', 'index.html');
			resource.setText(html);

			return htmlHandler.handle(resource).then(function() {
				resource.getUrl().should.be.eql('http://some-other-domain.com/src');
				resource.getText().should.not.containEql('<base');
			});
		});

		it('should remove base tag from text and update resource url for relative href', function () {
			var html = `
				<html lang="en">
				<head>
					<base href="/src">
				</head>
				<body></body> 
				</html>
			`;
			var resource = new Resource('http://example.com', 'index.html');
			resource.setText(html);

			return htmlHandler.handle(resource).then(function() {
				resource.getUrl().should.be.eql('http://example.com/src');
				resource.getText().should.not.containEql('<base');
			});
		});

		it('should not remove base tag if it doesn\'t have href attribute', function () {
			var html = `
				<html lang="en">
				<head>
					<base target="_blank">
				</head>
				<body></body> 
				</html>
			`;
			var resource = new Resource('http://example.com', 'index.html');
			resource.setText(html);

			return htmlHandler.handle(resource).then(function() {
				resource.getUrl().should.be.eql('http://example.com');
				resource.getText().should.containEql('<base target="_blank">');
			});
		});
	});

	it('should not encode text to html entities', function () {
		var html = `
			<html>
			<body>
				<p>Этот текст не должен быть преобразован в html entities</p>
			</body>
			</html>
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(function () {
			resource.getText().should.containEql('Этот текст не должен быть преобразован в html entities');
		});
	});

	it('should call handleChildrenResources for each source', function () {
		htmlHandler.options.sources.push({ selector: 'img', attr: 'src' });

		var html = `
			<html lang="en">
			<head></head>
			<body>
				<img src="a.png">
				<img src="b.png">
				<img src="c.png">
			</body>
			</html>
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(function() {
			htmlHandler.handleChildrenPaths.calledThrice.should.be.eql(true);
		});
	});

	it('should not call handleChildrenResources if source attr is empty', function () {
		htmlHandler.options.sources.push({ selector: 'img', attr: 'src' });

		var html = `
			<html lang="en">
			<head></head>
			<body><img src=""></body>
			</html>
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(function() {
			htmlHandler.handleChildrenPaths.called.should.be.eql(false);
		});
	});

	it('should use correct path containers based on tag', function() {
		htmlHandler.options.sources.push({ selector: 'img', attr: 'src' });
		htmlHandler.options.sources.push({ selector: 'img', attr: 'srcset' });
		htmlHandler.options.sources.push({ selector: '.styled', attr: 'style' });

		var html = `
			<html lang="en">
			<head></head>
			<body>
				<img src="a.png">
				<img srcset="b.png">
				<div class="styled" style="background-image: url(\'c.png\')"></div>
			</body>
			</html>
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(function() {
			htmlHandler.handleChildrenPaths.calledThrice.should.be.eql(true);
			htmlHandler.handleChildrenPaths.args[0][0].should.be.instanceOf(HtmlCommonTag);
			htmlHandler.handleChildrenPaths.args[1][0].should.be.instanceOf(HtmlImgSrcsetTag);
			htmlHandler.handleChildrenPaths.args[2][0].should.be.instanceOf(CssText);
		});
	});
});
