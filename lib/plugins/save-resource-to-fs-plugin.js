import path from 'path';
import fs from 'fs';
import { outputFileStream } from '../utils/fs.js';

class SaveResourceToFileSystemPlugin {
	apply (registerAction) {
		let absoluteDirectoryPath, wroteToDirectory = false;

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
			wroteToDirectory = true; // outputFileStream creates directories even if the write then fails
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
			// remove what this plugin created (a failed save may leave directories behind even
			// when no resource was saved), but nothing when it wrote nothing - the directory
			// may then hold files placed there by other plugins
			if (wroteToDirectory) {
				await fs.promises.rm(absoluteDirectoryPath, {force: true, recursive: true});
			}
		});
	}
}

export default SaveResourceToFileSystemPlugin;
