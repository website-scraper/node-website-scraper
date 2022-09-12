import bySiteStructureFilenameGenerator from '../filename-generator/by-site-structure.js';

class GenerateFilenameBySiteStructurePlugin {
	apply (registerAction) {
		registerAction('beforeStart', this.beforeStart.bind(this));
		registerAction('generateFilename', this.generateFilename.bind(this));
	}

	beforeStart ({options}) {
		this.defaultFilename = options.defaultFilename;
	}

	generateFilename ({resource}) {
		const filename = bySiteStructureFilenameGenerator(resource, {defaultFilename: this.defaultFilename});
		return {filename};
	}
}

export default GenerateFilenameBySiteStructurePlugin;
