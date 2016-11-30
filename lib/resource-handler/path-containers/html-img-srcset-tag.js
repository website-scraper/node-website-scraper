var srcset = require('srcset');
var _ = require('lodash');

function HtmlImgSrcSetTag (text) {
	this.text = text || '';
	this.imgSrcsetParts = srcset.parse(this.text);
	this.paths = this.imgSrcsetParts.map(function getPath (imgSrcset) {
		return imgSrcset.url;
	});
}

HtmlImgSrcSetTag.prototype.getPaths = function getPaths () {
	return this.paths;
};

HtmlImgSrcSetTag.prototype.updateText = function updateText (pathsToUpdate) {
	var imgSrcsetParts = this.imgSrcsetParts;
	pathsToUpdate.forEach(function updatePath (path) {
		var srcsToUpdate = _.filter(imgSrcsetParts, {url: path.oldPath});
		srcsToUpdate.forEach((srcToUpdate) => {
			srcToUpdate.url = path.newPath;
		});
	});
	return srcset.stringify(imgSrcsetParts);
};

module.exports = HtmlImgSrcSetTag;
