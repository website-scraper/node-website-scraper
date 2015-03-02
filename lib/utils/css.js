var _ = require('underscore');

function isEmbedded(src) {
  var embeddedRegexp = /data:(.*?);base64,/;
  return embeddedRegexp.test(src);
}

function getSourcesPaths(text) {
  var commentRegexp = /\/\*([\s\S]*?)\*\//g;
  var sourcesRegexp = /((?:@import\s+)?url\s*\(['"]?)(\S*?)(['"]?\s*\))|(@import\s+['"]?)([^;'"]+)/ig
  var paths = [];
  var urlMatch;

  text = text.replace(commentRegexp, '');

  while (urlMatch = sourcesRegexp.exec(text)) {
    // Match 2 group if '[@import] url(path)', match 5 group if '@import path'
    paths.push(urlMatch[2]||urlMatch[5]);
  }

  return _.chain(paths)
    .compact()
    .reject(isEmbedded)
    .uniq()
    .value();
}

module.exports.isEmbedded = isEmbedded;
module.exports.getSourcesPaths = getSourcesPaths;