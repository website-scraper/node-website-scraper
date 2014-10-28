var url = require('url');

function trimFilename(filename) {
  var queryRegexp = /[\?#](.*)$/;
  return filename.replace(queryRegexp, '');
}

function isPathAbsolute(path) {
  var absolutePathRegexp = /^(http:\/|https:\/|\/\/)/;
  return absolutePathRegexp.test(path);
}

function getAbsolutePath(currentUrl, path) {
  var pathObj = url.parse(path);
  if (isPathAbsolute(path) && !pathObj.protocol) {
    pathObj.protocol = 'http';
    path = url.format(pathObj);
  }
  return url.resolve(currentUrl, path);
}

function pathToUnixFormat(filepath) {
  return filepath.replace(/\\/g, '/');
}

// Check if path contains base64 encoded image
function isEmbeddedSource(path) {
  var embeddedRegexp = /data:(.*?);base64,/;
  return embeddedRegexp.test(path);
}

module.exports.getAbsolutePath = getAbsolutePath;
module.exports.pathToUnixFormat = pathToUnixFormat;
module.exports.isEmbeddedSource = isEmbeddedSource;
module.exports.trimFilename = trimFilename;
