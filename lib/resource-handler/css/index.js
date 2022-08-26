import CssText from './../path-containers/css-text.js';
import logger from '../../logger.js';
import { getCharsetFromCss } from '../../utils/index.js';

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
	if (charset && charset === 'utf-8') { // TODO: support more charsets here?
		const enconding = 'utf8';
		logger.debug(`@charset="${charset}" found in ${resource}, changing encoding to ${enconding}`);
		resource.setEncoding(enconding);
	}
}

export default CssResourceHandler;
