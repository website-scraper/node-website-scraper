var CssText = require('./path-handlers/css-text');

function loadCss (context, resource) {
	var loadChildrenResource = context.handleChildrenResources(CssText, context, resource, resource.getText());

	return loadChildrenResource.then(function updateText (updatedText) {
		resource.setText(updatedText);
		return resource;
	});
}

module.exports = loadCss;
