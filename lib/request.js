var _ = require('underscore');
var Promise = require('bluebird');
var request = require('request');
var get = Promise.promisify(request.get);
var url_ = require('url');
var fs = require('fs');

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
	var parsedUrl = url_.parse (url);
	var protocol = parsedUrl.protocol || '';
	var requestOptions = getCustomOptions(options);
	requestOptions.url = url;

	return get(requestOptions).then(
		function handleResponse(data) {
			return {
				url: data.request.href,
				body: data.body
			};
		},
		function error(err) {
			if (protocol === 'file:') {
				var data = fs.readFileSync(parsedUrl.path);

				return {
					url: parsedUrl.href,
					body: data
				};
			}
			throw err;
		}
	);
}

module.exports.makeRequest = makeRequest;
module.exports.getDefaultOptions = getDefaultOptions;
module.exports.getCustomOptions = getCustomOptions;
