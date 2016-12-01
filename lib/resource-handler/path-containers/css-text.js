var getCssUrls = require('css-url-parser');
var _ = require('lodash');
var format = require('util').format;

function changeExactlyMatchedUrl (text, oldUrl, newUrl) {
	// starts with ' " ( ends with ' " )
	var exactlyMatchedPattern = format('([\'"\\(\\s])%s([\'"\\)\\s])', _.escapeRegExp(oldUrl));
	var exactlyMatchedRegexp = new RegExp(exactlyMatchedPattern, 'g');
	text = text.replace(exactlyMatchedRegexp, function changeUrl (match, g1, g2) {
		return g1 + newUrl + g2;
	});
	return text;
}

function CssText (text) {
	this.text = text || '';
	this.paths = getCssUrls(this.text);
}

CssText.prototype.getPaths = function getPaths () {
	return this.paths;
};

CssText.prototype.updateText = function updateText (pathsToUpdate) {
	var updatedText = this.text;
	pathsToUpdate.forEach(function updatePath (path) {
		updatedText = changeExactlyMatchedUrl(updatedText, path.oldPath, path.newPath);
	});
	return updatedText;
};

module.exports = CssText;


