const CssText = require('./../path-containers/css-text');

class CssResourceHandler {
	constructor (options, handleChildrenPaths) {
		this.options = options;
		this.handleChildrenPaths = handleChildrenPaths;
		this.updateMissingSources = this.options.updateMissingSources === true || Array.isArray(this.options.updateMissingSources);
	}

	handle (resource) {
		const pathContainer = new CssText(resource.getText());
		return this.handleChildrenPaths(pathContainer, resource, this.updateMissingSources).then(function updateText (updatedText) {
			resource.setText(updatedText);
			return resource;
		});
	}
}

module.exports = CssResourceHandler;
