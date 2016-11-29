var CssText = require('./path-containers/css-text');

function loadCss (context, resource) {
	var pathContainer = new CssText(resource.getText());
	var loadChildrenResource = context.handleChildrenResources(pathContainer, resource);

	return loadChildrenResource.then(function updateText (updatedText) {
		resource.setText(updatedText);
		return resource;
	});
}

module.exports = loadCss;
