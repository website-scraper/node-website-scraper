const byTypeFilenameGenerator = require('../filename-generator/by-type');

class GenerateFilenameByTypePlugin {
	apply (registerAction) {
		let occupiedFilenames, subdirectories, defaultFilename;

		registerAction('beforeStart', ({options}) => {
			occupiedFilenames = [];
			subdirectories = options.subdirectories;
			defaultFilename = options.defaultFilename;
		});
		registerAction('generateFilename', ({resource}) => {
			const filename = byTypeFilenameGenerator(resource, {subdirectories, defaultFilename}, occupiedFilenames);
			occupiedFilenames.push(filename);
			return {filename};
		});
	}
}

module.exports = GenerateFilenameByTypePlugin;
