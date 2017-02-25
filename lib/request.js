'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request');
var get = Promise.promisify(request.get);
var logger = require('./logger');

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function defaultResponseHandler (response) {
	return Promise.resolve(response.body);
}

function transformResult (result) {
	if (typeof result === 'string') {
		return {
			body: result,
			metadata: null
		}
	} else {
		return {
			body: result.body,
			metadata: result.metadata
		}
	}
}

class Request {
	/**
	 *
	 * @param {Object} options
	 * @param {function} options.httpResponseHandler - custom response handler
	 * @param {Object} options.request - custom options for request module
	 */
	constructor(options) {
		this.handleResponse = options.httpResponseHandler ? options.httpResponseHandler : defaultResponseHandler;
		this.options = _.clone(options.request);
	}

	/**
	 * Performs get request to url and returns data for resource
	 * @param {string} url - url of resource
	 * @param {string} referer - url of parent resource
	 * @return {Promise}
	 */
	get(url, referer) {
		let requestOptions = _.clone(this.options);
		requestOptions.url = url;

		if (referer) {
			requestOptions.headers = requestOptions.headers || {};
			requestOptions.headers.referer = referer;
		}

		logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

		return get(requestOptions).then((response) => {
			logger.debug(`[request] received response for ${response.request.href}, statusCode ${response.statusCode}`);
			return this.handleResponse(response)
				.then(transformResult)
				.then((responseHandlerResult) => {
					return {
						url: response.request.href,
						mimeType: getMimeType(response.headers['content-type']),
						body: responseHandlerResult.body,
						metadata: responseHandlerResult.metadata
					};
				});
		});
	}
}

module.exports = Request;
