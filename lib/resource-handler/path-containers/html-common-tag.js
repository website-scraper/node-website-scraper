var _ = require('lodash');
var utils = require('../../utils');

function getPaths (text) {
	var isSamePageId = _.startsWith(text, '#');
	var isUriSchemaSupported = utils.isUriSchemaSupported(text);
	if (isSamePageId || !isUriSchemaSupported) {
		return [];
	}
	return [text];
}

function HtmlCommonTag (text) {
	this.text = text || '';
	this.paths = getPaths(this.text);
}

HtmlCommonTag.prototype.getPaths = function getPaths () {
	return this.paths;
};

HtmlCommonTag.prototype.updateText = function updateText (pathsToUpdate) {
	var pathToUpdate = _.find(pathsToUpdate, {oldPath: this.paths[0]});
	return pathToUpdate ? pathToUpdate.newPath : this.text;
};

module.exports = HtmlCommonTag;

