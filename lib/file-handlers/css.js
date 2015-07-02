var Promise = require('bluebird');
var _ = require('underscore');
var getCssUrls = require('css-url-parser');
var PageObject = require('../page-object');
var utils = require('../utils');

function loadCss (context, pageObject) {
	var url = pageObject.getUrl();
	var filename = pageObject.getFilename();
	var text = pageObject.getText();
	var cssUrls = getCssUrls(text);

	var promises = _.map(cssUrls, function loadSourceFromCssUrl (cssUrl) {
		var sourceUrl = utils.getUrl(url, cssUrl);
		var sourcePageObject = new PageObject(sourceUrl);

		return context.loadPageObject(sourcePageObject).then(function handleLoadedSource (loadedPageObject) {
			var relativePath = utils.getRelativePath(filename, loadedPageObject.getFilename());
			text = text.replace(new RegExp(cssUrl, 'g'), relativePath);
			return Promise.resolve();
		});
	});

	return Promise.settle(promises).then(function () {
		pageObject.setText(text);
		return pageObject;
	});
}

module.exports = loadCss;