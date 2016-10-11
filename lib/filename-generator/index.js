var _ = require('lodash');
var byTypeFilenameGenerator = require('./by-type');
var bySiteStructureFilenameGenerator = require('./by-site-structure');

var builtInStrategies = {
	byType: byTypeFilenameGenerator,
	bySiteStructure: bySiteStructureFilenameGenerator
};

var supportedOptions = ['filenameGenerator', 'subdirectories', 'defaultFilename'];

function FilenameGenerator (options) {
	var self = this;

	self.options = _.pick(options, supportedOptions);

	var currentStrategy = self.options.filenameGenerator;
	self.executeCurrentStrategy = _.isString(currentStrategy) ? builtInStrategies[currentStrategy] : currentStrategy;

	self.occupiedFileNames = [];
}

FilenameGenerator.prototype.generateFilename = function generateFilename (resource) {
	var self = this;
	var filename = self.executeCurrentStrategy(resource, self.options, self.occupiedFileNames);
	self.addOccupiedFileName(filename);
	return filename;
};

FilenameGenerator.prototype.addOccupiedFileName = function addOccupiedFilename (filename) {
	this.occupiedFileNames.push(filename);
};

module.exports = FilenameGenerator;
