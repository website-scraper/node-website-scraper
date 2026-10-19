import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function outputFileStream (file, stream) {
	const dir = path.dirname(file);
	await fs.mkdir(dir, { recursive: true});

	return pipeline(stream, createWriteStream(file));
}

export {
	outputFileStream
};
