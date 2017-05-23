'use strict';

require('should');
const Promise = require('bluebird');
const sinon = require('sinon');
const Resource = require('../../../lib/resource');
const HtmlHandler = require('../../../lib/resource-handler/html');

const HtmlImgSrcsetTag = require('../../../lib/resource-handler/path-containers/html-img-srcset-tag');
const HtmlCommonTag = require('../../../lib/resource-handler/path-containers/html-common-tag');
const CssText = require('../../../lib/resource-handler/path-containers/css-text');

describe('ResourceHandler: Html', () => {
	let htmlHandler;

	beforeEach(() => {
		htmlHandler = new HtmlHandler({ sources: [] }, sinon.stub().returns(Promise.resolve()));
	});

	describe('<base> tag', () => {
		it('should remove base tag from text and update resource url for absolute href', () => {
			const html = `
				<html lang="en">
				<head>
					<base href="http://some-other-domain.com/src">
				</head>
				<body></body> 
				</html>
			`;
			const resource = new Resource('http://example.com', 'index.html');
			resource.setText(html);

			return htmlHandler.handle(resource).then(() =>{
				resource.getUrl().should.be.eql('http://some-other-domain.com/src');
				resource.getText().should.not.containEql('<base');
			});
		});

		it('should remove base tag from text and update resource url for relative href', () => {
			const html = `
				<html lang="en">
				<head>
					<base href="/src">
				</head>
				<body></body> 
				</html>
			`;
			const resource = new Resource('http://example.com', 'index.html');
			resource.setText(html);

			return htmlHandler.handle(resource).then(() => {
				resource.getUrl().should.be.eql('http://example.com/src');
				resource.getText().should.not.containEql('<base');
			});
		});

		it('should not remove base tag if it doesn\'t have href attribute', () => {
			const html = `
				<html lang="en">
				<head>
					<base target="_blank">
				</head>
				<body></body> 
				</html>
			`;
			const resource = new Resource('http://example.com', 'index.html');
			resource.setText(html);

			return htmlHandler.handle(resource).then(() => {
				resource.getUrl().should.be.eql('http://example.com');
				resource.getText().should.containEql('<base target="_blank">');
			});
		});
	});

	it('should not encode text to html entities', () => {
		const html = `
			<html>
			<body>
				<p>Этот текст не должен быть преобразован в html entities</p>
			</body>
			</html>
		`;

		const resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(() => {
			resource.getText().should.containEql('Этот текст не должен быть преобразован в html entities');
		});
	});

	it('should call handleChildrenResources for each source', () => {
		htmlHandler.options.sources.push({ selector: 'img', attr: 'src' });

		const html = `
			<html lang="en">
			<head></head>
			<body>
				<img src="a.png">
				<img src="b.png">
				<img src="c.png">
			</body>
			</html>
		`;

		const resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(() =>{
			htmlHandler.handleChildrenPaths.calledThrice.should.be.eql(true);
		});
	});

	it('should not call handleChildrenResources if source attr is empty', () =>{
		htmlHandler.options.sources.push({ selector: 'img', attr: 'src' });

		const html = `
			<html lang="en">
			<head></head>
			<body><img src=""></body>
			</html>
		`;

		const resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(() =>{
			htmlHandler.handleChildrenPaths.called.should.be.eql(false);
		});
	});

	it('should use correct path containers based on tag', () =>{
		htmlHandler.options.sources.push({ selector: 'img', attr: 'src' });
		htmlHandler.options.sources.push({ selector: 'img', attr: 'srcset' });
		htmlHandler.options.sources.push({ selector: '.styled', attr: 'style' });

		const html = `
			<html lang="en">
			<head></head>
			<body>
				<img src="a.png">
				<img srcset="b.png">
				<div class="styled" style="background-image: url(\'c.png\')"></div>
			</body>
			</html>
		`;

		const resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return htmlHandler.handle(resource).then(() =>{
			htmlHandler.handleChildrenPaths.calledThrice.should.be.eql(true);
			htmlHandler.handleChildrenPaths.args[0][0].should.be.instanceOf(HtmlCommonTag);
			htmlHandler.handleChildrenPaths.args[1][0].should.be.instanceOf(HtmlImgSrcsetTag);
			htmlHandler.handleChildrenPaths.args[2][0].should.be.instanceOf(CssText);
		});
	});

	it('should remove SRI check for loaded resources', () => {
		htmlHandler.options.sources.push({ selector: 'script', attr: 'src' });

		const html = `
			<html>
			<head>
				<link href="http://examlpe.com/style.css" integrity="sha256-gaWb8m2IHSkoZnT23u/necREOC//MiCFtQukVUYMyuU=" rel="stylesheet">
			</head>
			<body>
				<script integrity="sha256-X+Q/xqnlEgxCczSjjpp2AUGGgqM5gcBzhRQ0p+EAUEk=" src="http://example.com/script.js"></script>
			</body>
			</html>
		`;

		const resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		// before handle should contain both integrity checks
		resource.getText().should.containEql('integrity="sha256-gaWb8m2IHSkoZnT23u/necREOC//MiCFtQukVUYMyuU="');
		resource.getText().should.containEql('integrity="sha256-X+Q/xqnlEgxCczSjjpp2AUGGgqM5gcBzhRQ0p+EAUEk="');

		return htmlHandler.handle(resource).then(() => {
			// after handle should contain integrity check for styles
			// but not contain integrity check for script because it was loaded
			resource.getText().should.containEql('integrity="sha256-gaWb8m2IHSkoZnT23u/necREOC//MiCFtQukVUYMyuU="');
			resource.getText().should.not.containEql('integrity="sha256-X+Q/xqnlEgxCczSjjpp2AUGGgqM5gcBzhRQ0p+EAUEk="');
		});
	});
});
