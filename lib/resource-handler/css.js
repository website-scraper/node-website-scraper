var CssText = require('./path-containers/css-text');

function loadCss (context, resource) {
	var pathContainer = new CssText(resource.getText());
	return context.handleChildrenResources(pathContainer, resource).then(function updateText (updatedText) {
		resource.setText(updatedText);
		return resource;
	});
}

module.exports = loadCss;
