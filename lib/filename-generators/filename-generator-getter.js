var _ = require('lodash');
var byTypeFilenameGenerator = require('./by-type');
var bySiteStructureFilenameGenerator = require('./by-site-structure');

var fileNameGenerators = {
	byType: byTypeFilenameGenerator,
	bySiteStructure: bySiteStructureFilenameGenerator
};

module.exports = function getFileNameGenerator (fileNameGenerator){
	if (_.isString(fileNameGenerator)) {
		return fileNameGenerators[fileNameGenerator];
	} else {
		return fileNameGenerator;
	}
};
