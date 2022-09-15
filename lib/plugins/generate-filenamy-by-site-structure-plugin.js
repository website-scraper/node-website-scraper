import bySiteStructureFilenameGenerator from '../filename-generator/by-site-structure.js';

class GenerateFilenameBySiteStructurePlugin {
	apply (registerAction) {
		let defaultFilename;

		registerAction('beforeStart', ({options}) => {
			defaultFilename = options.defaultFilename;
		});
		registerAction('generateFilename', ({resource}) => {
			const filename = bySiteStructureFilenameGenerator(resource, {defaultFilename});
			return {filename};
		});
	}
}

export default GenerateFilenameBySiteStructurePlugin;
