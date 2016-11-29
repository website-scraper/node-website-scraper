var srcset = require('srcset');
var _ = require('lodash');

function HtmlImgSrcSetTag (text) {
	this.text = text;
	this.paths = [];
	this.imgSrcsetParts = null;
}

HtmlImgSrcSetTag.prototype.getPaths = function getPaths () {
	this.imgSrcsetParts = srcset.parse(this.text);
	this.paths = this.imgSrcsetParts.map(function getPath (imgSrcset) {
		return imgSrcset.url;
	});
	return this.paths;
};

HtmlImgSrcSetTag.prototype.updateText = function updateText (pathsToUpdate) {
	var imgSrcsetParts = this.imgSrcsetParts;
	pathsToUpdate.forEach(function updatePath (path) {
		var srcToUpdate = _.find(imgSrcsetParts, {url: path.oldPath});
		if (srcToUpdate) {
			srcToUpdate.url = path.newPath;
		}
	});
	return srcset.stringify(imgSrcsetParts);
};

module.exports = HtmlImgSrcSetTag;
