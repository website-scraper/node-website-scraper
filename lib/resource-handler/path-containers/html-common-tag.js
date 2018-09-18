const _ = require('lodash');
const utils = require('../../utils');

function getPaths (text) {
	const isSamePageId = _.startsWith(text, '#');
	const isUriSchemaSupported = utils.isUriSchemaSupported(text);
	if (isSamePageId || !isUriSchemaSupported) {
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
		const pathToUpdate = _.find(pathsToUpdate, {oldPath: this.paths[0]});
		return pathToUpdate ? pathToUpdate.newPath : this.text;
	}
}

module.exports = HtmlCommonTag;

