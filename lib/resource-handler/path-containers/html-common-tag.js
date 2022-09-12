import {isUriSchemaSupported} from '../../utils/index.js';

function getPaths (text) {
	const isSamePageId = text.startsWith('#');
	const uriSchemaSupported = isUriSchemaSupported(text);
	if (isSamePageId || !uriSchemaSupported) {
		return [];
	}
	return [text];
}

class HtmlCommonTag {
	constructor (text) {
		this.text = text || '';
		this.paths = getPaths(this.text);
	}

	getPaths () {
		return this.paths;
	}

	updateText (pathsToUpdate) {
		const pathToUpdate = pathsToUpdate.find(p => p.oldPath === this.paths[0]);
		return pathToUpdate ? pathToUpdate.newPath : this.text;
	}
}

export default HtmlCommonTag;

