import got from 'got';
import logger from './logger.js';
import { extend } from './utils/index.js';

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function defaultResponseHandler ({response}) {
	return Promise.resolve(response);
}

function extractEncodingFromHeader (headers) {
	const contentTypeHeader = headers['content-type'];

	return contentTypeHeader && contentTypeHeader.includes('utf-8') ? 'utf8' : 'binary';
}

function getEncoding (response) {
	if (response && typeof response === 'object') {
		if (response.headers && typeof response.headers === 'object') {
			return extractEncodingFromHeader(response.headers);
		} else if (response.encoding) {
			return response.encoding;
		}
	}

	return 'binary';
}

function throwTypeError (result) {
	let type = typeof result;

	if (result instanceof Error) {
		throw result;
	} else if (type === 'object' && Array.isArray(result)) {
		type = 'array';
	}

	throw new Error(`Wrong response handler result. Expected string or object, but received ${type}`);
}

function getData (result) {
	let data = result;
	if (result && typeof result === 'object' && 'body' in result) {
		data = result.body;
	}

	return data;
}

function transformResult (result) {
	const encoding = getEncoding(result);
	const data = getData(result);

	// Check for no data
	if (data === null || data === undefined) {
		return null;
	}

	// Then stringify it.
	let body = null;
	if (data instanceof Buffer) {
		body = data.toString(encoding);
	} else if (typeof data === 'string') {
		body = data;
	} else {
		throwTypeError(result);
	}

	return {
		body,
		encoding,
		metadata: result.metadata || data.metadata || null
	};
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
	get: getRequest,
	getEncoding,
	transformResult
};
