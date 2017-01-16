var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request');
var get = Promise.promisify(request.get);
var logger = require('./logger');

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function makeRequest (options, url, referer) {
	var requestOptions = _.clone(options);
	requestOptions.url = url;

	if (referer) {
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers.referer = referer;
	}

	logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

	return get(requestOptions).then(function handleResponse (data) {
		logger.debug(`[request] received response for ${data.request.href}, statusCode ${data.statusCode}`);
		return {
			url: data.request.href,
			mimeType: getMimeType(data.headers['content-type']),
			body: data.body
		};
	});
}

module.exports = makeRequest;
