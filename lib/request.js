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

	// charset values are case-insensitive (RFC 9110), e.g. "UTF-8" is common
	return contentTypeHeader && contentTypeHeader.toLowerCase().includes('utf-8') ? 'utf8' : 'binary';
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
 * Attaches got retry handling to a request stream and resolves with { response, stream } when
 * response headers arrive, before the body is consumed. Attaching the 'retry' listener is what
 * enables got retries for streams - transient errors before/at response time are retried with
 * a fresh stream. The listener is removed once headers arrive: a consumer which streams the body
 * (e.g. pipeline to storage) cannot be handed a replacement stream, see readBodyWithRetry for
 * consumers which buffer the body and can.
 */
function waitForResponse (url, initialStream) {
	return new Promise((resolve, reject) => {
		const attempt = (stream) => {
			const onRetry = (retryCount, error, createRetryStream) => {
				stream.off('response', onResponse);
				stream.off('error', onError);
				logger.debug(`[request] retrying request for ${url}, attempt ${retryCount}, reason: ${error.message}`);
				attempt(createRetryStream());
			};
			const onResponse = (response) => {
				stream.off('retry', onRetry);
				stream.off('error', onError);
				// a body error emitted before the consumer attaches its own handlers must not crash the process
				stream.on('error', (err) => logger.debug(`[request] response stream error for ${response.url}: ${err.message}`));
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
		attempt(initialStream);
	});
}

function requestWithRetry (url, requestOptions) {
	return waitForResponse(url, got.stream(url, requestOptions));
}

/*
 * Reads the whole body of a response stream with the 'retry' listener attached, so that got
 * retries a transient mid-body error (e.g. connection reset) within its retry rules instead
 * of emitting it. Resolves with { body } or, when got retried, with { retryStream }.
 */
function readBodyOrRetry (url, stream) {
	let onRetry;
	const retried = new Promise((resolve) => {
		onRetry = (retryCount, error, createRetryStream) => {
			logger.debug(`[request] retrying request for ${url} after body error, attempt ${retryCount}, reason: ${error.message}`);
			resolve({ retryStream: createRetryStream() });
		};
		stream.once('retry', onRetry);
	});
	// got destroys the stream right before emitting 'retry', so on retry the read fails
	// a tick later - the race has already settled with retryStream by then
	const read = readStreamToBuffer(stream).then((body) => ({ body }));

	return Promise.race([read, retried]).finally(() => stream.off('retry', onRetry));
}

/*
 * Buffers the body of a response stream, re-reading it from the retried response whenever
 * got retries the request mid-body (limit, errorCodes and backoff are got's).
 */
async function readBodyWithRetry (url, stream) {
	let current = stream;
	for (;;) {
		const { body, retryStream } = await readBodyOrRetry(url, current);
		if (body) {
			return body;
		}
		({ stream: current } = await waitForResponse(url, retryStream));
	}
}

function afterResponseBodyToBuffer (body, encoding) {
	if (Buffer.isBuffer(body)) {
		return body;
	}
	if (body instanceof Uint8Array) {
		return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	}
	if (typeof body !== 'string') {
		throwAfterResponseTypeError(body);
	}
	return Buffer.from(body, encoding);
}

/*
 * Maps afterResponse result to responseData, or null if the resource should be skipped.
 * bufferedBodyPromise is set when the action read the body via getBody.
 */
async function buildAfterResponseData ({ result, responseData, bufferedBodyPromise }) {
	if (result === null || result === undefined) {
		return null;
	}

	if (typeof result !== 'object' || Array.isArray(result) || result instanceof Error) {
		throwAfterResponseTypeError(result);
	}

	const hasBody = 'body' in result;
	if (hasBody && (result.body === null || result.body === undefined)) {
		return null; // no body - skip the resource, same as returning null
	}

	const overrides = {
		encoding: result.encoding || responseData.encoding,
		metadata: result.metadata || null
	};

	if (hasBody) {
		overrides.stream = Readable.from(afterResponseBodyToBuffer(result.body, overrides.encoding));
	} else if (bufferedBodyPromise !== null) {
		// body was read by the action - original stream is consumed, serve the buffered copy
		overrides.stream = Readable.from(await bufferedBodyPromise);
	}

	if (overrides.stream) {
		overrides.readBody = () => readStreamToBuffer(overrides.stream);
	}

	return extend(responseData, overrides);
}

async function applyAfterResponse ({ responseData, headers, afterResponse }) {
	const originalStream = responseData.stream;
	// memoize the promise, not the value - concurrent getBody calls must not
	// both start reading the same one-shot stream
	let bufferedBodyPromise = null;
	const getBody = () => (bufferedBodyPromise ??= responseData.readBody());

	let transformed = null;
	try {
		const result = await afterResponse({
			response: {
				url: responseData.url,
				statusCode: responseData.statusCode,
				headers,
				getBody
			}
		});
		transformed = await buildAfterResponseData({ result, responseData, bufferedBodyPromise });
		return transformed;
	} finally {
		if (!transformed || transformed.stream !== originalStream) {
			// the live stream is not handed over to the caller - destroy it to release
			// the socket (no-op when the body was already fully read via getBody)
			originalStream.destroy();
		}
	}
}

/*
 * Resolves when response headers arrive with
 * { url, statusCode, mimeType, encoding, metadata, stream, readBody }
 * The body is NOT buffered - it is available as a Readable in stream, or via readBody()
 * which buffers it with got retries for mid-body errors. Use one or the other.
 * Returns null if the resource should be skipped (afterResponse returned null).
 */
async function getRequest ({ url, referer, options = {}, afterResponse }) {
	const requestOptions = extend(options, {}); // got v16 does not allow url in options
	delete requestOptions.responseType; // meaningless for streams

	if (referer) {
		requestOptions.headers = extend(requestOptions.headers, { referer });
	}

	logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

	const { response, stream } = await requestWithRetry(url, requestOptions);
	logger.debug(`[request] received response for ${response.url}, statusCode ${response.statusCode}`);

	const responseData = {
		url: response.url,
		statusCode: response.statusCode,
		mimeType: getMimeType(response.headers['content-type']),
		encoding: extractEncodingFromHeader(response.headers),
		metadata: null,
		stream,
		readBody: () => readBodyWithRetry(url, stream)
	};

	if (!afterResponse) {
		return responseData;
	}

	return applyAfterResponse({ responseData, headers: response.headers, afterResponse });
}

export default {
	get: getRequest
};
