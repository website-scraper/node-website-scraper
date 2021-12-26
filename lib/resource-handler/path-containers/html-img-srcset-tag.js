import { parseSrcset, stringifySrcset } from 'srcset';

class HtmlImgSrcSetTag {
	constructor (text) {
		this.text = text || '';
		this.imgSrcsetParts = parseSrcset(this.text);
		this.paths = this.imgSrcsetParts.map(imgSrcset => imgSrcset.url);
	}

	getPaths () {
		return this.paths;
	}

	updateText (pathsToUpdate) {
		const imgSrcsetParts = this.imgSrcsetParts;
		pathsToUpdate.forEach((path) => {
			const srcsToUpdate = imgSrcsetParts.filter(imgSrcsetPart => imgSrcsetPart.url === path.oldPath);
			srcsToUpdate.forEach((srcToUpdate) => {
				srcToUpdate.url = path.newPath;
			});
		});
		return stringifySrcset(imgSrcsetParts);
	}
}

export default HtmlImgSrcSetTag;
