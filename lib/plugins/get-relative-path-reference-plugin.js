const utils = require('../utils');

class GetRelativePathReferencePlugin {
	apply (registerAction) {
		registerAction('getUpdatedPath', ({resource, parentResource}) => {
			if (resource) {
				const relativePath = utils.getRelativePath(parentResource.getFilename(), resource.getFilename());
				return { path: relativePath };
			}

			return { path: null };
		});
	}
}

module.exports = GetRelativePathReferencePlugin;
