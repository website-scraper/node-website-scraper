import byTypeFilenameGenerator from '../filename-generator/by-type.js';

class GenerateFilenameByTypePlugin {
	apply (registerAction) {
		registerAction('beforeStart', this.beforeStart.bind(this));
		registerAction('generateFilename', this.generateFilename.bind(this));
	}

	beforeStart ({options}) {
		this.occupiedFilenames = [];
		this.subdirectories = options.subdirectories;
		this.defaultFilename = options.defaultFilename;
	}

	generateFilename ({resource}) {
		const filename = byTypeFilenameGenerator(resource, {
			subdirectories: this.subdirectories,
			defaultFilename: this.defaultFilename},
		this.occupiedFilenames);
		this.occupiedFilenames.push(filename);
		return {filename};
	}
}

export default GenerateFilenameByTypePlugin;
