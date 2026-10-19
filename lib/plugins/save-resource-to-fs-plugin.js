import path from 'path';
import fs from 'fs';
import { outputFileStream } from '../utils/fs.js';

class SaveResourceToFileSystemPlugin {
	apply (registerAction) {
		let absoluteDirectoryPath, directoryWasValidated = false;

		registerAction('beforeStart', ({options}) => {
			if (!options.directory || typeof options.directory !== 'string') {
				throw new Error(`Incorrect directory ${options.directory}`);
			}

			absoluteDirectoryPath = path.resolve(process.cwd(), options.directory);

			if (fs.existsSync(absoluteDirectoryPath)) {
				throw new Error(`Directory ${absoluteDirectoryPath} exists`);
			}
			directoryWasValidated = true;
		});

		registerAction('saveResource', async ({resource}) => {
			const filename = path.join(absoluteDirectoryPath, resource.getFilename());
			try {
				await outputFileStream(filename, resource.getContentStream());
			} catch (err) {
				try {
					await fs.promises.rm(filename, {force: true}); // don't leave partially written files
				} catch {
					// cleanup failure must not mask the original save error
				}
				throw err;
			}
		});

		registerAction('error', async () => {
			// a failed save may leave directories behind even when no resource was saved -
			// remove them unless the directory existed before the scrape (beforeStart threw)
			if (directoryWasValidated) {
				await fs.promises.rm(absoluteDirectoryPath, {force: true, recursive: true});
			}
		});
	}
}

export default SaveResourceToFileSystemPlugin;
