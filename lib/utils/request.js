var _ = require('underscore');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

var defaultOptions = {
  method: 'GET',
  encoding: 'binary',
  strictSSL: false,
  jar: true
};

function makeRequest(options, url) {
  var requestOptions = _.extend(defaultOptions, options);
  requestOptions.url = url;

  return request.getAsync(requestOptions).then(function (data) {
    return {
      url: data[0].request.href,
      body: data[0].body
    };
  });
}

module.exports.makeRequest = makeRequest;
