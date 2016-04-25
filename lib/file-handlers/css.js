var _ = require('lodash');
var format = require('util').format;
var getCssUrls = require('css-url-parser');
var utils = require('../utils');

function changeExactlyMatchedUrl (text, oldUrl, newUrl) {
	// starts with ' " ( ends with ' " )
	var exactlyMatchedPattern = format('([\'"\\(\\s])%s([\'"\\)\\s])', _.escapeRegExp(oldUrl));
	var exactlyMatchedRegexp = new RegExp(exactlyMatchedPattern, 'g');
	text = text.replace(exactlyMatchedRegexp, function changeUrl (match, g1, g2) {
		return g1 + newUrl + g2;
	});
	return text;
}

function loadCss (context, resource) {
	var url = resource.getUrl();
	var filename = resource.getFilename();
	var text = resource.getText();
	var cssUrls = getCssUrls(text);

	var promises = _.map(cssUrls, function loadResourceFromCssUrl (cssUrl) {
		var childUrl = utils.getUrl(url, cssUrl);
		var childResource = resource.createChild(childUrl);

		return context.loadResource(childResource).then(function handleLoadedSource (loadedResource) {
			if(loadedResource){
				resource.updateChild(childResource, loadedResource);

				var relativePath = utils.getRelativePath(filename, loadedResource.getFilename());
				text = changeExactlyMatchedUrl(text, cssUrl, relativePath);
			}
		});
	});

	return utils.waitAllFulfilled(promises).then(function updateCssText () {
		resource.setText(text);
		return resource;
	});
}

module.exports = loadCss;
