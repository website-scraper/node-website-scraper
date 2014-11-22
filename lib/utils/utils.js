var url = require('url');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

function trimFilename(filename) {
  var queryRegexp = /[\?#](.*)$/;
  return filename.replace(queryRegexp, '');
}

function isUrl(path) {
  var absolutePathRegexp = /^(http:\/|https:\/|\/\/)/;
  return absolutePathRegexp.test(path);
}

function getUrl(currentUrl, path) {
  var pathObj = url.parse(path);
  if (isUrl(path) && !pathObj.protocol) {
    pathObj.protocol = 'http';
    path = url.format(pathObj);
  }
  return url.resolve(currentUrl, path);
}

function getUnixPath(filepath) {
  return filepath.replace(/\\/g, '/');
}

function isEmbeddedSource(path) {
  var embeddedRegexp = /data:(.*?);base64,/;
  return embeddedRegexp.test(path);
}

function makeRequest(url) {
  return request.getAsync({
    url: url,
    method: 'GET',
    encoding: 'binary',
    strictSSL: false
  }).then(function (response) {
      return response[1]
  });
}

module.exports.getUrl = getUrl;
module.exports.getUnixPath = getUnixPath;
module.exports.isEmbeddedSource = isEmbeddedSource;
module.exports.trimFilename = trimFilename;
module.exports.makeRequest = makeRequest;