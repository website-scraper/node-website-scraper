const GenerateFilenameBySiteStructurePlugin = require('./generate-filenamy-by-site-structure-plugin');
const GenerateFilenameByTypePlugin = require('./generate-filenamy-by-type-plugin');
const SaveResourceToFileSystemPlugin = require('./save-resource-to-fs-plugin');
const GetResourceReferencePlugin = require('./get-relative-path-reference-plugin');

module.exports = {
	GenerateFilenameBySiteStructurePlugin,
	GenerateFilenameByTypePlugin,
	SaveResourceToFileSystemPlugin,
	GetResourceReferencePlugin
};
