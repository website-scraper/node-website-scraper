var _ = require('lodash');
var utils = require('../utils');
var CssText = require('./path-handlers/css-text');

function loadCss (context, resource) {
	var text = resource.getText();

	var cssText = new CssText(text);
	var childrenPaths = cssText.getPaths();
	var pathsToUpdate = [];

	var promises = _.map(childrenPaths, function loadChildrenPath (childrenPath) {
		var childResourceUrl = utils.getUrl(resource.getUrl(), childrenPath);

		var childResource = resource.createChild(childResourceUrl);

		return context.requestResource(childResource).then(function updateSrcsetPart (respondedResource) {
			if (respondedResource) {
				resource.updateChild(childResource, respondedResource);

				var relativePath = utils.getRelativePath(resource.getFilename(), respondedResource.getFilename());
				pathsToUpdate.push({ oldPath: childrenPath, newPath: relativePath});

				// Do not wait for loadResource here, to prevent deadlock, see scraper.waitForLoad
				context.loadResource(respondedResource);
			}
			return null; // Prevent Bluebird warnings
		});
	});

	return utils.waitAllFulfilled(promises).then(function updateChildrenPaths () {
		var updatedText = cssText.updateText(pathsToUpdate);
		resource.setText(updatedText);
		return resource;
	});
}

module.exports = loadCss;
