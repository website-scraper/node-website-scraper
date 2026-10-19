/*
 * Memory benchmark for issue #386.
 *
 * Starts a local http server serving an html page referencing FILES_COUNT
 * binary files of FILE_SIZE_MB each (generated chunk-wise on the fly, so the
 * server itself stays flat), scrapes it and reports peak memory usage.
 *
 * Usage:
 *   npm run benchmark:memory
 *   FILES_COUNT=50 FILE_SIZE_MB=10 REQUEST_CONCURRENCY=8 npm run benchmark:memory
 */

import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import scrape from 'website-scraper';

const FILES_COUNT = parseInt(process.env.FILES_COUNT || '100', 10);
const FILE_SIZE_MB = parseInt(process.env.FILE_SIZE_MB || '20', 10);
const REQUEST_CONCURRENCY = parseInt(process.env.REQUEST_CONCURRENCY || '8', 10);

const CHUNK = Buffer.alloc(64 * 1024, 0xab);
const CHUNKS_PER_FILE = Math.ceil(FILE_SIZE_MB * 1024 * 1024 / CHUNK.length);

function startServer () {
	const server = http.createServer((req, res) => {
		if (req.url === '/') {
			const imgs = Array.from({length: FILES_COUNT}, (_, i) => `<img src="blob/${i}.bin">`).join('\n');
			res.writeHead(200, {'content-type': 'text/html'});
			res.end(`<html><head></head><body>${imgs}</body></html>`);
			return;
		}

		res.writeHead(200, {'content-type': 'application/octet-stream'});
		let sent = 0;
		const writeChunk = () => {
			while (sent < CHUNKS_PER_FILE) {
				sent++;
				if (!res.write(CHUNK)) {
					res.once('drain', writeChunk);
					return;
				}
			}
			res.end();
		};
		writeChunk();
	});

	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve(server));
	});
}

function formatMB (bytes) {
	return `${Math.round(bytes / 1024 / 1024)} MB`;
}

const server = await startServer();
const baseUrl = `http://127.0.0.1:${server.address().port}/`;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'website-scraper-benchmark-'));
fs.rmSync(directory, {recursive: true, force: true}); // scraper requires the directory to not exist

const peak = {rss: 0, heapUsed: 0, external: 0, arrayBuffers: 0};
const sampler = setInterval(() => {
	const usage = process.memoryUsage();
	for (const key of Object.keys(peak)) {
		peak[key] = Math.max(peak[key], usage[key]);
	}
}, 200);

console.log(`scraping ${FILES_COUNT} files x ${FILE_SIZE_MB} MB (${FILES_COUNT * FILE_SIZE_MB} MB total), concurrency ${REQUEST_CONCURRENCY}`);
const startedAt = Date.now();

try {
	await scrape({
		urls: [baseUrl],
		directory,
		requestConcurrency: REQUEST_CONCURRENCY
	});
} finally {
	clearInterval(sampler);
	server.close();
	fs.rmSync(directory, {recursive: true, force: true});
}

console.log(`done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(`peak rss:          ${formatMB(peak.rss)}`);
console.log(`peak heapUsed:     ${formatMB(peak.heapUsed)}`);
console.log(`peak external:     ${formatMB(peak.external)}`);
console.log(`peak arrayBuffers: ${formatMB(peak.arrayBuffers)}`);
