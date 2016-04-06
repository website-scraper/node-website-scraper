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
		var childUrl = utils.getUrl(url, cssUrl);
		var childResource = resource.createChild(childUrl);

		return context.loadResource(childResource).then(function handleLoadedSource (loadedResource) {
			resource.updateChild(childResource, loadedResource);

			var relativePath = utils.getRelativePath(filename, loadedResource.getFilename());
			text = text.replace(cssUrl, relativePath);
			return Promise.resolve();
		});
	});

	return utils.waitAllFulfilled(promises).then(function updateCssText () {
		resource.setText(text);
		return resource;
	});
}

module.exports = loadCss;
