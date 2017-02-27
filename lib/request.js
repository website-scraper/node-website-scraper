'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const request = require('request');
const get = Promise.promisify(request.get);
const logger = require('./logger');

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function defaultResponseHandler (response) {
	return Promise.resolve(response.body);
}

function transformResult (result) {
	switch (true) {
		case _.isString(result):
			return {
				body: result,
				metadata: null
			};
		case _.isPlainObject(result):
			return {
				body: result.body,
				metadata: result.metadata || null
			};
		default:
			throw new Error('Wrong response handler result. Expected string or object, but received ' + typeof result);
	}
}

class Request {
	/**
	 *
	 * @param {Object} options
	 * @param {function} options.httpResponseHandler - custom response handler
	 * @param {Object} options.request - custom options for request module
	 */
	constructor (options) {
		this.handleResponse = options && options.httpResponseHandler ? options.httpResponseHandler : defaultResponseHandler;
		this.options = options && options.request ? _.clone(options.request) : {};
	}

	/**
	 * Performs get request to url and returns data for resource
	 * @param {string} url - url of resource
	 * @param {string} referer - url of parent resource
	 * @return {Promise}
	 */
	get (url, referer) {
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
