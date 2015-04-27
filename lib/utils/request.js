var _ = require('underscore');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

var defaultOptions = {
  method: 'GET',
  encoding: 'binary',
  strictSSL: false,
  jar: true
};

function getDefaultOptions() {
  return defaultOptions;
}

function getCustomOptions(options) {
  return _.extend({}, defaultOptions, options);
}

function makeRequest(options, url) {
  var requestOptions = getCustomOptions(options);
  requestOptions.url = url;

  return request.getAsync(requestOptions).then(function (data) {
    return {
      url: data[0].request.href,
      body: data[0].body
    };
  });
}

module.exports.makeRequest = makeRequest;
module.exports.getDefaultOptions = getDefaultOptions;
module.exports.getCustomOptions = getCustomOptions;
