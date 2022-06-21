import CssText from './../path-containers/css-text.js';

class CssResourceHandler {
	constructor (options, methods) {
		this.options = options;
		this.downloadChildrenPaths = methods.downloadChildrenPaths;
		this.updateMissingSources = this.options.updateMissingSources === true || Array.isArray(this.options.updateMissingSources);
	}

	async handle (resource) {
		const pathContainer = new CssText(await resource.getText());

		const updatedText = await this.downloadChildrenPaths(pathContainer, resource, this.updateMissingSources);
		await resource.setText(updatedText);
		
		return resource;
	}
}

export default CssResourceHandler;
