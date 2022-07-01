import got from 'got';
import logger from './logger.js';
import { extend } from './utils/index.js';
import * as cheerio from 'cheerio';

function defaultResponseHandler ({response}) {
	return Promise.resolve(response);
}

function extractEncodingFromResponse (response) {
	if (response && typeof response === 'object') {
		if (response.headers && typeof response.headers === 'object') {
			const contentTypeHeader = response.headers['content-type'];

			return contentTypeHeader && contentTypeHeader.includes('utf-8') ? 'utf8' : 'binary';
		}
	}

	return undefined;
}

function extractMimeTypeFromResponse (response) {
	if (response && typeof response === 'object') {
		if (response.headers && typeof response.headers === 'object') {
			const contentTypeHeader = response.headers['content-type'];

			if (typeof contentTypeHeader === 'string') {
				return contentTypeHeader.split(';')[0];
			}
		}
	}

	return null;
}

function extractEncodingFromHtmlResponse (response) {
	try {
		const body = getBodyAsString(response);

		if (body) {
			const $ = cheerio.load(body);
			const charset = $('meta[charset]').attr('charset');

			if (charset && charset.toLowerCase() === 'utf-8') {
				return 'utf-8';
			}
		}

	} catch (err) {
		logger.error('Error parsing response html', response.url);
	}

	return 'binary';
}

function extractEncodingFromCssResponse (response) {
	try {
		const body = getBodyAsString(response);

		if (body && body.includes('@charset "UTF-8"')) {
			return 'utf-8';
		}

	} catch (err) {
		logger.error('Error parsing response html', response.url);
	}

	return 'binary';
}

function getEncoding (response) {
	let encoding = 'binary';

	if (response && typeof response === 'object') {
		encoding = response.encoding || extractEncodingFromResponse(response) || encoding;

		if (encoding === 'binary') {
			switch (extractMimeTypeFromResponse(response)) {
				case 'text/html':
					encoding = extractEncodingFromHtmlResponse(response);
					break;

				case 'text/css':
					encoding = extractEncodingFromCssResponse(response);
					break;

				default:
					break;
			}
		}
	}

	return encoding;
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

function getBodyAsString (result, encoding) {
	const data = getData(result);

	// Check for no data
	if (data === null || data === undefined) {
		return null;
	}

	// Then stringify it.
	let body = null;
	if (data instanceof Buffer) {
		body = data.toString(encoding || 'binary');
	} else if (typeof data === 'string') {
		body = data;
	} else {
		throwTypeError(result);
	}

	return body;
}

function transformResult (result) {
	const encoding = getEncoding(result);
	const data = getData(result);
	const body = getBodyAsString(result, encoding);

	if (data === null || body === null) {
		return null;
	}

	return {
		body,
		encoding,
		metadata: (result && result.metadata) || (data && data.metadata) || null
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
		mimeType: extractMimeTypeFromResponse(response),
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
