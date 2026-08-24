import path from 'path';
import fs from 'fs';
import { outputFileStream } from '../utils/fs.js';

class SaveResourceToFileSystemPlugin {
	apply (registerAction) {
		let absoluteDirectoryPath, loadedResources = [];

		registerAction('beforeStart', ({options}) => {
			if (!options.directory || typeof options.directory !== 'string') {
				throw new Error(`Incorrect directory ${options.directory}`);
			}

			absoluteDirectoryPath = path.resolve(process.cwd(), options.directory);

			if (fs.existsSync(absoluteDirectoryPath)) {
				throw new Error(`Directory ${absoluteDirectoryPath} exists`);
			}
		});

		registerAction('saveResource', async ({resource}) => {
			const filename = path.join(absoluteDirectoryPath, resource.getFilename());
			try {
				await outputFileStream(filename, resource.getContentStream());
			} catch (err) {
				await fs.promises.rm(filename, {force: true}); // don't leave partially written files
				throw err;
			}
			loadedResources.push(resource);
		});

		registerAction('error', async () => {
			if (loadedResources.length > 0) {
				await fs.promises.rm(absoluteDirectoryPath, {force: true, recursive: true});
			}
		});
	}
}

export default SaveResourceToFileSystemPlugin;
