import getCssUrls from 'css-url-parser';
import { format } from 'util';

function escapeRegExp (string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}  

function changeExactlyMatchedUrl (text, oldUrl, newUrl) {
	// starts with ' " ( ends with ' " )
	const exactlyMatchedPattern = format('([\'"\\(\\s])%s([\'"\\)\\s])', escapeRegExp(oldUrl));
	const exactlyMatchedRegexp = new RegExp(exactlyMatchedPattern, 'g');
	text = text.replace(exactlyMatchedRegexp, function changeUrl (match, g1, g2) {
		return g1 + newUrl + g2;
	});
	return text;
}

class CssText {
	constructor (text) {
		this.text = text || '';
		this.paths = getCssUrls(this.text);
	}

	getPaths () {
		return this.paths;
	}

	updateText (pathsToUpdate) {
		let updatedText = this.text;
		pathsToUpdate.forEach(function updatePath (path) {
			updatedText = changeExactlyMatchedUrl(updatedText, path.oldPath, path.newPath);
		});
		return updatedText;
	}
}


export default CssText;


