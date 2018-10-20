const _ = require('lodash');
const byTypeFilenameGenerator = require('./by-type');
const bySiteStructureFilenameGenerator = require('./by-site-structure');

const builtInStrategies = {
	byType: byTypeFilenameGenerator,
	bySiteStructure: bySiteStructureFilenameGenerator
};

const supportedOptions = ['filenameGenerator', 'subdirectories', 'defaultFilename'];

function FilenameGenerator (options) {
	const self = this;

	self.options = _.pick(options, supportedOptions);

	const currentStrategy = self.options.filenameGenerator;
	self.executeCurrentStrategy = _.isString(currentStrategy) ? builtInStrategies[currentStrategy] : currentStrategy;

	self.occupiedFileNames = [];
}

FilenameGenerator.prototype.generateFilename = function generateFilename (resource) {
	const self = this;
	const filename = self.executeCurrentStrategy(resource, self.options, self.occupiedFileNames);
	self.addOccupiedFileName(filename);
	return filename;
};

FilenameGenerator.prototype.addOccupiedFileName = function addOccupiedFilename (filename) {
	this.occupiedFileNames.push(filename);
};

module.exports = FilenameGenerator;

class ByTypeFilenamePlugin {
	apply (registerAction) {
		let occupiedFilenames, subdirectories, defaultFilename;

		registerAction('beforeStart', ({options} = {}) => {
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

class BySiteStructurePlugin {
	apply (registerAction) {
		let defaultFilename;

		registerAction('beforeStart', ({options} = {}) => {
			defaultFilename = options.defaultFilename;
		});
		registerAction('generateFilename', ({resource}) => {
			const filename = byTypeFilenameGenerator(resource, {defaultFilename});
			return {filename};
		});
	}
}

module.exports.plugins = {
	byType: ByTypeFilenamePlugin,
	bySiteStructure: BySiteStructurePlugin
};
