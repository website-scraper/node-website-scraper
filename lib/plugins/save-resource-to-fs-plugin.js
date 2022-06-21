import path from 'path';
import { promises as fs } from 'fs';

class SaveResourceToFileSystemPlugin {
	apply (registerAction) {
		let absoluteDirectoryPath, loadedResources = [];

		registerAction('beforeStart', async ({options}) => {
			if (!options.directory || typeof options.directory !== 'string') {
				throw new Error(`Incorrect directory ${options.directory}`);
			}

			absoluteDirectoryPath = path.resolve(process.cwd(), options.directory);

			let exists = false;
			try {
				await fs.stat(absoluteDirectoryPath);
				exists = true;
			} catch (err) {
				// lstat throws an error if the directory doesn't exist. 
				// We don't care about that error because we don't want that
				// directory to exist. 
			}

			if (exists) {
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
