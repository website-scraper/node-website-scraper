
function HtmlCommonTag(text) {
	this.text = text;
	this.paths = [];
	this.pathsToUpdate = [];
}

HtmlCommonTag.prototype.getPaths = function getPaths () {
	this.paths.push(this.text);
	return this.paths;
};

HtmlCommonTag.prototype.updateText = function updateText (pathsToUpdate) {
	this.pathsToUpdate = pathsToUpdate;
	return this.pathsToUpdate[0].newPath;
};

module.exports = HtmlCommonTag;


