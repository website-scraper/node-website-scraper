var _ = require('underscore');
var Promise = require('bluebird');
var getCssUrls = require('css-url-parser');
var utils = require('../utils');

function loadCss (context, resource) {
	var url = resource.getUrl();
	var filename = resource.getFilename();
	var text = resource.getText();
	var cssUrls = getCssUrls(text);

	var promises = _.map(cssUrls, function loadResourceFromCssUrl (cssUrl) {
		var resourceUrl = utils.getUrl(url, cssUrl);
		var cssResource = resource.createChild(resourceUrl);

		return context.loadResource(cssResource).then(function handleLoadedSource (loadedResource) {
			var relativePath = utils.getRelativePath(filename, loadedResource.getFilename());
			text = text.replace(cssUrl, relativePath);
			return Promise.resolve();
		});
	});

	return utils.waitAllFulfilled(promises).then(function () {
		resource.setText(text);
		return resource;
	});
}

module.exports = loadCss;
