require('should');
var Promise = require('bluebird');
var sinon = require('sinon');
require('sinon-as-promised')(Promise);
var Resource = require('../../../lib/resource');
var loadHtml = require('../../../lib/resource-handler/html');
var HtmlImgSrcsetTag = require('../../../lib/resource-handler/path-containers/html-img-srcset-tag');
var HtmlCommonTag = require('../../../lib/resource-handler/path-containers/html-common-tag');

describe('ResourceHandler: Html', function () {
	describe('<base> tag', function () {
		it('should remove base tag from text and update resource url for absolute href', function () {
			var context = {
				options: {
					sources: []
				},
				handleChildrenResources: sinon.stub().resolves()
			};
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

			return loadHtml(context, resource).then(function() {
				resource.getUrl().should.be.eql('http://some-other-domain.com/src');
				resource.getText().should.not.containEql('<base');
			});
		});

		it('should remove base tag from text and update resource url for relative href', function () {
			var context = {
				options: {
					sources: []
				},
				handleChildrenResources: sinon.stub().resolves()
			};
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

			return loadHtml(context, resource).then(function() {
				resource.getUrl().should.be.eql('http://example.com/src');
				resource.getText().should.not.containEql('<base');
			});
		});

		it('should not remove base tag if it doesn\'t have href attribute', function () {
			var context = {
				options: {
					sources: []
				},
				handleChildrenResources: sinon.stub().resolves()
			};
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

			return loadHtml(context, resource).then(function() {
				resource.getUrl().should.be.eql('http://example.com');
				resource.getText().should.containEql('<base target="_blank">');
			});
		});
	});

	it('should not encode text to html entities', function () {
		var context = {
			options: {
				sources: []
			},
			handleChildrenResources: sinon.stub().resolves()
		};
		var html = `
			<html>
			<body>
				<p>Этот текст не должен быть преобразован в html entities</p>
			</body>
			</html>
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return loadHtml(context, resource).then(function () {
			resource.getText().should.containEql('Этот текст не должен быть преобразован в html entities');
		});
	});

	it('should call handleChildrenResources for each source', function () {
		var context = {
			options: {
				sources: [
					{ selector: 'img', attr: 'src' }
				]
			},
			handleChildrenResources: sinon.stub().resolves()
		};

		var html = `
			<html lang="en">
			<head></head>
			<body>
				<img src="a.png">
				<img src="b.png">
				<img src="c.png">
			</body>
			</html>\
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return loadHtml(context, resource).then(function() {
			context.handleChildrenResources.calledThrice.should.be.eql(true);
		});
	});

	it('should not call handleChildrenResources if source attr is empty', function () {
		var context = {
			options: {
				sources: [
					{ selector: 'img', attr: 'src' },
				]
			},
			handleChildrenResources: sinon.stub().resolves()
		};

		var html = `
			<html lang="en">
			<head></head>
			<body><img src=""></body>
			</html>\
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return loadHtml(context, resource).then(function() {
			context.handleChildrenResources.called.should.be.eql(false);
		});
	});

	it('should not call handleChildrenResources if source is url with not supported schema (like mailto: or javascript:)', function () {
		var context = {
			options: {
				sources: [
					{ selector: 'a', attr: 'href' }
				]
			},
			handleChildrenResources: sinon.stub().resolves()
		};

		var html = `
			<html lang="en">
			<head></head>
			<body>
				<a href="mailto:sophie@example.com">
				<a href="skype:profile_name">
				<a href="javascript:alert('Hello World!');">
			</body>
			</html>\
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return loadHtml(context, resource).then(function() {
			context.handleChildrenResources.called.should.be.eql(false);
		});
	});

	it('should use correct path containers based on tag', function() {
		var context = {
			options: {
				sources: [
					{ selector: 'img', attr: 'src' },
					{ selector: 'img', attr: 'srcset' }
				]
			},
			handleChildrenResources: sinon.stub().resolves()
		};

		var html = `
			<html lang="en">
			<head></head>
			<body>
				<img src="a.png">
				<img srcset="b.png">
			</body>
			</html>\
		`;

		var resource = new Resource('http://example.com', 'index.html');
		resource.setText(html);

		return loadHtml(context, resource).then(function() {
			context.handleChildrenResources.calledTwice.should.be.eql(true);
			context.handleChildrenResources.args[0][0].should.be.instanceOf(HtmlCommonTag);
			context.handleChildrenResources.args[1][0].should.be.instanceOf(HtmlImgSrcsetTag);
		});
	});
});
