var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request');
var get = Promise.promisify(request.get);

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function makeRequest (options, url) {
	var requestOptions = _.clone(options);
	requestOptions.url = url;

	return get(requestOptions).then(function handleResponse (data) {
		return {
			url: data.request.href,
			mimeType: getMimeType(data.headers['content-type']),
			body: data.body
		};
	});
}

module.exports = makeRequest;
