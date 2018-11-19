const utils = require('../utils');

class GetRelativePathReferencePlugin {
	apply (registerAction) {
		registerAction('getReference', ({resource, parentResource}) => {
			if (resource) {
				const relativePath = utils.getRelativePath(parentResource.getFilename(), resource.getFilename());
				return { reference: relativePath };
			}

			return { reference: null };
		});
	}
}

module.exports = GetRelativePathReferencePlugin;
