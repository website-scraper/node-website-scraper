import CssText from './../path-containers/css-text.js';
import { getCharsetFromCss, updateResourceEncoding } from '../../utils/index.js';

class CssResourceHandler {
	constructor (options, methods) {
		this.options = options;
		this.downloadChildrenPaths = methods.downloadChildrenPaths;
		this.updateMissingSources = this.options.updateMissingSources === true || Array.isArray(this.options.updateMissingSources);
	}

	async handle (resource) {
		prepareToLoad(resource);

		const pathContainer = new CssText(resource.getText());

		const updatedText = await this.downloadChildrenPaths(pathContainer, resource, this.updateMissingSources);
		resource.setText(updatedText);
		return resource;
	}
}

function prepareToLoad (resource) {
	const charset = getCharsetFromCss(resource.getText());
	if (charset && charset === 'utf-8') { // do we need to support more charsets here?
		updateResourceEncoding(resource, 'utf8');
	}
}

export default CssResourceHandler;
