var _ = require('lodash');

function HtmlCommonTag (text) {
	this.text = text || '';
	this.paths = [this.text];
}

HtmlCommonTag.prototype.getPaths = function getPaths () {
	return this.paths;
};

HtmlCommonTag.prototype.updateText = function updateText (pathsToUpdate) {
	var pathToUpdate = _.find(pathsToUpdate, {oldPath: this.paths[0]});
	return pathToUpdate ? pathToUpdate.newPath : this.text;
};

module.exports = HtmlCommonTag;

