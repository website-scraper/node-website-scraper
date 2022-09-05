import { getRelativePath } from '../utils/index.js';

class GetRelativePathReferencePlugin {
	apply (registerAction) {
		registerAction('getReference', this.getReference.bind(this));
	}

	getReference ({resource, parentResource}) {
		if (resource) {
			const relativePath = getRelativePath(parentResource.getFilename(), resource.getFilename());
			return { reference: relativePath };
		}

		return { reference: null };
	}
}

export default GetRelativePathReferencePlugin;
