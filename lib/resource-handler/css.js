var CssText = require('./path-containers/css-text');

function loadCss (context, resource) {
	var loadChildrenResource = context.handleChildrenResources(CssText, resource, resource.getText());

	return loadChildrenResource.then(function updateText (updatedText) {
		resource.setText(updatedText);
		return resource;
	});
}

module.exports = loadCss;
