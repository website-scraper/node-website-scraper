var _ = require('underscore');

function isEmbedded(src) {
  var embeddedRegexp = /data:(.*?);base64,/;
  return embeddedRegexp.test(src);
}

function getSourcesPaths(text) {
  var commentRegexp = /\/\*([\s\S]*?)\*\//g;
  var sourcesRegexps = [
    /(@import[\s]*['"]?[\s]*)([\s\S]*?)([\s]*['"]?;)/ig,
    /((?:@import[\s]*)?url[\s]*\([\s'"]*)([\s\S]*?)([\s'"]*\))/ig
  ];
  var paths = [];

  text = text.replace(commentRegexp, '');

  _.each(sourcesRegexps, function (regexp) {
    var urlMatch;
    while (urlMatch = regexp.exec(text)) {
      paths.push(urlMatch[2]);
    }
  });

  return _.chain(paths)
    .compact()
    .reject(isEmbedded)
    .uniq()
    .value();
}

module.exports.isEmbedded = isEmbedded;
module.exports.getSourcesPaths = getSourcesPaths;