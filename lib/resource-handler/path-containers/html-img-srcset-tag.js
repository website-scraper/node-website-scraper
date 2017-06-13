'use strict';

const srcset = require('srcset');
const _ = require('lodash');

class HtmlImgSrcSetTag {
	constructor (text) {
		this.text = text || '';
		this.imgSrcsetParts = srcset.parse(this.text);
		this.paths = this.imgSrcsetParts.map(imgSrcset => imgSrcset.url);
	}

	getPaths () {
		return this.paths;
	}

	updateText (pathsToUpdate) {
		const imgSrcsetParts = this.imgSrcsetParts;
		pathsToUpdate.forEach(function updatePath (path) {
			const srcsToUpdate = _.filter(imgSrcsetParts, {url: path.oldPath});
			srcsToUpdate.forEach((srcToUpdate) => {
				srcToUpdate.url = path.newPath;
			});
		});
		return srcset.stringify(imgSrcsetParts);
	}
}

module.exports = HtmlImgSrcSetTag;
