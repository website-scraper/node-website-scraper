
function HtmlCommonTag (text) {
	this.text = text;
	this.paths = [];
}

HtmlCommonTag.prototype.getPaths = function getPaths () {
	this.paths = [this.text];
	return this.paths;
};

HtmlCommonTag.prototype.updateText = function updateText (pathsToUpdate) {
	if (pathsToUpdate && pathsToUpdate[0]) {
		return pathsToUpdate[0].newPath;
	}
	return this.text;
};

module.exports = HtmlCommonTag;

