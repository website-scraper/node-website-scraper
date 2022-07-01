import path from 'path';
import { promises as fs } from 'fs';
import { exists } from '../utils/index.js';

class SaveResourceToFileSystemPlugin {
	apply (registerAction) {
		let absoluteDirectoryPath, loadedResources = [];

		registerAction('beforeStart', async ({options}) => {
			if (!options.directory || typeof options.directory !== 'string') {
				throw new Error(`Incorrect directory ${options.directory}`);
			}

			absoluteDirectoryPath = path.resolve(process.cwd(), options.directory);

			if (await exists(absoluteDirectoryPath)) {
				throw new Error(`Directory ${absoluteDirectoryPath} exists`);
			}
		});

		registerAction('saveResource', async ({resource}) => {
			const filename = path.join(absoluteDirectoryPath, resource.getFilename());
			await fs.mkdir(path.dirname(filename), { recursive: true });

			const text = await resource.getText();

			await fs.writeFile(filename, text, { encoding: resource.getEncoding() });
			loadedResources.push(resource);
		});

		registerAction('error', async () => {
			if (loadedResources.length > 0) {
				await fs.rm(absoluteDirectoryPath, { recursive: true, force: true });
			}
		});
	}
}

export default SaveResourceToFileSystemPlugin;
