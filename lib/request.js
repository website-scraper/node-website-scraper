import request from 'request';
import { promisify } from 'util';
const get = promisify(request.get);
import logger from './logger.js';
import { extend, isPlainObject } from './utils/index.js';

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function defaultResponseHandler ({response}) {
	return Promise.resolve(response.body);
}

function transformResult (result) {
	switch (true) {
		case typeof result === 'string':
			return {
				body: result,
				metadata: null
			};
		case isPlainObject(result):
			return {
				body: result.body,
				metadata: result.metadata || null
			};
		case result === null:
			return null;
		default:
			throw new Error('Wrong response handler result. Expected string or object, but received ' + typeof result);
	}
}

const getRequest = ({url, referer, options = {}, afterResponse = defaultResponseHandler}) => {
	const requestOptions = extend(options, {url});

	if (referer) {
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers.referer = referer;
	}

	logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

	return get(requestOptions).then((response) => {
		logger.debug(`[request] received response for ${response.request.href}, statusCode ${response.statusCode}`);
		return afterResponse({response})
			.then(transformResult)
			.then((responseHandlerResult) => {
				if (!responseHandlerResult) {
					return null;
				}
				return {
					url: response.request.href,
					mimeType: getMimeType(response.headers['content-type']),
					body: responseHandlerResult.body,
					metadata: responseHandlerResult.metadata
				};
			});
	});
};

export default {
	get: getRequest
};
