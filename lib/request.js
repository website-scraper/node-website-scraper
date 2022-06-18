import got from 'got';
import logger from './logger.js';
import { extend, isPlainObject } from './utils/index.js';

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function defaultResponseHandler ({response}) {
	return Promise.resolve(response);
}

function getEncoding (response) {
	if (response && typeof response.headers === 'object') {
		const contentTypeHeader = response.headers['content-type'];

		return contentTypeHeader && contentTypeHeader.includes('utf-8') ? 'utf8' : 'binary';
	}

	return 'binary';
}

/**
 * Normalizes the request response so to maintain compatibility with the old API
 * while adding the ability to extract the encoding information from the response.
 * 
 * @param response - Node Response, Buffer, string, or plain object.
 * @returns result and encoding.
 */
function normalizeResponse (response) {
	let result = response;
	let encoding = getEncoding(response);

	if (response) {
		if (response.body instanceof Buffer) {
			result = response.body.toString(encoding);
		} else {
			result = response.body.toString();
		}
	} else if (response instanceof Buffer) {
		result = response.toString(encoding);
	}

	return {
		result, 
		encoding
	};
}

function transformResult (response) {
	const {result, encoding} = normalizeResponse(response);

	switch (true) {
		case typeof result === 'string':
			return {
				body: result,
				metadata: null,
				encoding
			};
		case isPlainObject(result):
			return {
				body: result.body,
				metadata: result.metadata || null,
				encoding: result.encoding || encoding || 'binary'
			};
		case result === null:
			return null;			
		default:
			throw new Error('Wrong response handler result. Expected string or object, but received ' + typeof result);
	}
}

async function getRequest ({url, referer, options = {}, afterResponse = defaultResponseHandler}) {
	const requestOptions = extend(options, {url});

	if (referer) {
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers.referer = referer;
	}

	logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

	const response = await got(requestOptions);
	logger.debug(`[request] received response for ${response.url}, statusCode ${response.statusCode}`);
	const responseHandlerResult = transformResult(await afterResponse({response}));

	if (!responseHandlerResult) {
		return null;
	}
	return {
		url: response.url,
		mimeType: getMimeType(response.headers['content-type']),
		body: responseHandlerResult.body,
		metadata: responseHandlerResult.metadata,
		encoding: responseHandlerResult.encoding
	};
}

export default {
	get: getRequest
};
