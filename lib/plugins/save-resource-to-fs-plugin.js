import path from 'path';
import fs from 'fs-extra';

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
			const text = resource.getText();
			await fs.outputFile(filename, text, { encoding: resource.getEncoding() });
			loadedResources.push(resource);
		});

		registerAction('error', async () => {
			if (loadedResources.length > 0) {
				await fs.remove(absoluteDirectoryPath);
			}
		});
	}
}

export default SaveResourceToFileSystemPlugin;
