import CssText from './../path-containers/css-text.js';

class CssResourceHandler {
	constructor (options, methods) {
		this.options = options;
		this.downloadChildrenPaths = methods.downloadChildrenPaths;
		this.updateMissingSources = this.options.updateMissingSources === true || Array.isArray(this.options.updateMissingSources);
	}

	handle (resource) {
		const pathContainer = new CssText(resource.getText());
		return this.downloadChildrenPaths(pathContainer, resource, this.updateMissingSources).then(function updateText (updatedText) {
			resource.setText(updatedText);
			return resource;
		});
	}
}

export default CssResourceHandler;
