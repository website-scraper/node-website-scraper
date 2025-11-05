import path from 'path';
import fs from 'fs/promises';

async function outputFile (file, data, encoding) {
	const dir = path.dirname(file);
	await fs.mkdir(dir, { recursive: true});

	return fs.writeFile(file, data, { encoding: encoding });
}

export {
	outputFile
};
