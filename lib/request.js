var _ = require('underscore');
var Promise = require('bluebird');
var request = require('request');
var get = Promise.promisify(request.get);

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

	return get(requestOptions).then(function handleResponse(data) {
		return {
			url: data.request.href,
			body: data.body
		};
	});
}

module.exports.makeRequest = makeRequest;
module.exports.getDefaultOptions = getDefaultOptions;
module.exports.getCustomOptions = getCustomOptions;
