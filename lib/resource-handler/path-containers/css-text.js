'use strict';

const getCssUrls = require('css-url-parser');
const _ = require('lodash');
const format = require('util').format;
const AbstractPathContainer = require('./abstract-path-container');

function changeExactlyMatchedUrl (text, oldUrl, newUrl) {
	// starts with ' " ( ends with ' " )
	const exactlyMatchedPattern = format('([\'"\\(\\s])%s([\'"\\)\\s])', _.escapeRegExp(oldUrl));
	const exactlyMatchedRegexp = new RegExp(exactlyMatchedPattern, 'g');
	text = text.replace(exactlyMatchedRegexp, function changeUrl (match, g1, g2) {
		return g1 + newUrl + g2;
	});
	return text;
}

class CssText extends AbstractPathContainer {
	constructor (text) {
		super(text);
		this.paths = getCssUrls(this.text);
	}

	updateText (pathsToUpdate) {
		let updatedText = this.text;
		pathsToUpdate.forEach(function updatePath (path) {
			updatedText = changeExactlyMatchedUrl(updatedText, path.oldPath, path.newPath);
		});
		return updatedText;
	}
}


module.exports = CssText;


