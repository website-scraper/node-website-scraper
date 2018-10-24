const bySiteStructureFilenameGenerator = require('../filename-generator/by-site-structure');

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

module.exports = GenerateFilenameBySiteStructurePlugin;
