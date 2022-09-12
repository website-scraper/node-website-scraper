import path from 'path';
import fs from 'fs-extra';

class SaveResourceToFileSystemPlugin {
	apply (registerAction) {
		this.loadedResources = [];

		registerAction('beforeStart', this.beforeStart.bind(this));
		registerAction('saveResource', this.saveResource.bind(this));
		registerAction('error', this.error.bind(this));
	}

	beforeStart ({options}) {
		if (!options.directory || typeof options.directory !== 'string') {
			throw new Error(`Incorrect directory ${options.directory}`);
		}

		this.absoluteDirectoryPath = path.resolve(process.cwd(), options.directory);

		if (fs.existsSync(this.absoluteDirectoryPath)) {
			throw new Error(`Directory ${this.absoluteDirectoryPath} exists`);
		}
	}

	async saveResource ({resource}) {
		const filename = path.join(this.absoluteDirectoryPath, resource.getFilename());
		const text = resource.getText();
		await fs.outputFile(filename, text, { encoding: resource.getEncoding() });
		this.loadedResources.push(resource);
	}

	async error () {
		if (this.loadedResources.length > 0) {
			await fs.remove(this.absoluteDirectoryPath);
		}
	}
}

export default SaveResourceToFileSystemPlugin;
