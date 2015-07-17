var Promise = require('bluebird');
var _ = require('underscore');
var getCssUrls = require('css-url-parser');
var Resource = require('../resource');
var utils = require('../utils');

function loadCss (context, resource) {
	var url = resource.getUrl();
	var filename = resource.getFilename();
	var text = resource.getText();
	var cssUrls = getCssUrls(text);

	var promises = _.map(cssUrls, function loadResourceFromCssUrl (cssUrl) {
		var resourceUrl = utils.getUrl(url, cssUrl);
		var cssResource = new Resource(resourceUrl);

		return context.loadResource(cssResource).then(function handleLoadedSource () {
			var relativePath = utils.getRelativePath(filename, cssResource.getFilename());
			text = text.replace(new RegExp(cssUrl, 'g'), relativePath);
			return Promise.resolve();
		});
	});

	return Promise.settle(promises).then(function () {
		resource.setText(text);
		return resource;
	});
}

module.exports = loadCss;