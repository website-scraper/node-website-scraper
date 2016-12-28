var CssText = require('./../path-containers/css-text');

function CssResourceHandler (options, handleChildrenPaths) {
	this.options = options;
	this.handleChildrenPaths = handleChildrenPaths;
}

CssResourceHandler.prototype.handle = function handle (resource) {
	var pathContainer = new CssText(resource.getText());
	return this.handleChildrenPaths(pathContainer, resource).then(function updateText (updatedText) {
		resource.setText(updatedText);
		return resource;
	});
};

module.exports = CssResourceHandler;
