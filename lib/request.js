import got from 'got';
import { Readable } from 'stream';
import { buffer as readStreamToBuffer } from 'stream/consumers';
import logger from './logger.js';
import { extend } from './utils/index.js';

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function extractEncodingFromHeader (headers) {
	const contentTypeHeader = headers['content-type'];

	return contentTypeHeader && contentTypeHeader.includes('utf-8') ? 'utf8' : 'binary';
}

function throwAfterResponseTypeError (result) {
	let type = typeof result;

	if (result instanceof Error) {
		throw result;
	} else if (type === 'object' && Array.isArray(result)) {
		type = 'array';
	}

	throw new Error(`Wrong afterResponse result. Expected null or object with { body?, encoding?, metadata? }, but received ${type}`);
}

/*
 * Requests url with got.stream and resolves with { response, stream } when response headers arrive,
 * before the body is consumed. Attaching the 'retry' listener is what enables got retries for
 * streams - transient errors before/at response time are retried with a fresh stream.
 * Mid-body errors after the stream was handed over to the consumer cannot be retried.
 */
function requestWithRetry (requestOptions) {
	return new Promise((resolve, reject) => {
		const attempt = (stream) => {
			const onRetry = (retryCount, error, createRetryStream) => {
				stream.off('response', onResponse);
				stream.off('error', onError);
				logger.debug(`[request] retrying request for ${requestOptions.url}, attempt ${retryCount}, reason: ${error.message}`);
				attempt(createRetryStream());
			};
			const onResponse = (response) => {
				stream.off('retry', onRetry);
				stream.off('error', onError);
				resolve({ response, stream });
			};
			const onError = (error) => {
				stream.off('retry', onRetry);
				stream.off('response', onResponse);
				reject(error);
			};
			stream.once('retry', onRetry);
			stream.once('response', onResponse);
			stream.once('error', onError);
		};
		attempt(got.stream(requestOptions));
	});
}

async function applyAfterResponse ({ responseData, headers, afterResponse }) {
	const originalStream = responseData.stream;
	let bufferedBody = null;

	const getBody = async () => {
		if (bufferedBody === null) {
			bufferedBody = await readStreamToBuffer(originalStream);
		}
		return bufferedBody;
	};

	let result;
	try {
		result = await afterResponse({
			response: {
				url: responseData.url,
				statusCode: responseData.statusCode,
				headers,
				getBody
			}
		});
	} catch (err) {
		originalStream.destroy();
		throw err;
	}

	if (result === null || result === undefined) {
		originalStream.destroy();
		return null;
	}

	if (typeof result !== 'object' || Array.isArray(result) || result instanceof Error) {
		originalStream.destroy();
		throwAfterResponseTypeError(result);
	}

	const encoding = result.encoding || responseData.encoding;
	const metadata = result.metadata || null;

	if ('body' in result) {
		let bodyBuffer;
		if (Buffer.isBuffer(result.body)) {
			bodyBuffer = result.body;
		} else if (typeof result.body === 'string') {
			bodyBuffer = Buffer.from(result.body, encoding);
		} else {
			originalStream.destroy();
			throwAfterResponseTypeError(result.body);
		}
		if (bufferedBody === null) {
			originalStream.destroy(); // original body replaced without being read
		}
		return extend(responseData, { stream: Readable.from(bodyBuffer), encoding, metadata });
	}

	if (bufferedBody !== null) {
		// body was read by the action - original stream is consumed, serve the buffered copy
		return extend(responseData, { stream: Readable.from(bufferedBody), encoding, metadata });
	}

	return extend(responseData, { encoding, metadata });
}

/*
 * Resolves when response headers arrive with
 * { url, statusCode, mimeType, encoding, metadata, stream }
 * The body is NOT buffered - it is available as a Readable in stream.
 * Returns null if the resource should be skipped (afterResponse returned null).
 */
async function getRequest ({ url, referer, options = {}, afterResponse }) {
	const requestOptions = extend(options, { url });
	delete requestOptions.responseType; // meaningless for streams

	if (referer) {
		requestOptions.headers = extend(requestOptions.headers, { referer });
	}

	logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

	const { response, stream } = await requestWithRetry(requestOptions);
	logger.debug(`[request] received response for ${response.url}, statusCode ${response.statusCode}`);

	// a body error emitted before the consumer attaches its own handlers must not crash the process
	stream.on('error', (err) => logger.debug(`[request] response stream error for ${response.url}: ${err.message}`));

	const responseData = {
		url: response.url,
		statusCode: response.statusCode,
		mimeType: getMimeType(response.headers['content-type']),
		encoding: extractEncodingFromHeader(response.headers),
		metadata: null,
		stream
	};

	if (!afterResponse) {
		return responseData;
	}

	return applyAfterResponse({ responseData, headers: response.headers, afterResponse });
}

export default {
	get: getRequest
};
