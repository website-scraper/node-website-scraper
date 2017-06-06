'use strict';

const _ = require('lodash');
const utils = require('../../utils');
const AbstractPathContainer = require('./abstract-path-container');

function getPaths (text) {
	const isSamePageId = _.startsWith(text, '#');
	const isUriSchemaSupported = utils.isUriSchemaSupported(text);
	if (isSamePageId || !isUriSchemaSupported) {
		return [];
	}
	return [text];
}

class HtmlCommonTag extends AbstractPathContainer {
	constructor (text) {
		super(text);
		this.paths = getPaths(this.text);
	}
	updateText (pathsToUpdate) {
		const pathToUpdate = _.find(pathsToUpdate, {oldPath: this.paths[0]});
		return pathToUpdate ? pathToUpdate.newPath : this.text;
	}
}

module.exports = HtmlCommonTag;

