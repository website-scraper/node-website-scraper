const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');

const supportedOptions = [ 'directory' ];

class ResourceSaver {
	constructor (options) {
		this.options = _.pick(options, supportedOptions);

		if (!this.options.directory || typeof this.options.directory !== 'string') {
			throw new Error('Incorrect directory ' + this.options.directory);
		}

		this.absoluteDirectoryPath = path.resolve(process.cwd(), this.options.directory);

		if (fs.existsSync(this.absoluteDirectoryPath)) {
			throw new Error('Directory ' + this.absoluteDirectoryPath + ' exists');
		}

		this.loadedResources = [];
	}

	/**
	 * Save resource to file system
	 * @param {Resource} resource
	 * @returns {Promise}
	 */
	saveResource (resource) {
		const filename = path.join(this.absoluteDirectoryPath, resource.getFilename());
		const text = resource.getText();
		return fs.outputFile(filename, text, { encoding: 'binary' }).then(() => {
			this.loadedResources.push(resource);
		});
	}

	/**
	 * Remove all files that were saved before
	 * @returns {Promise}
	 */
	errorCleanup () {
		if (!_.isEmpty(this.loadedResources)) {
			return fs.remove(this.absoluteDirectoryPath);
		}
		return Promise.resolve();
	}
}

module.exports = ResourceSaver;

module.exports.plugin = class DefaultSaveResourceToFileSystemPlugin {
	apply(registerAction) {
		let absoluteDirectoryPath, loadedResources = [];

		registerAction('beforeStart', ({options} = {}) => {
			if (!options.directory || typeof options.directory !== 'string') {
				throw new Error(`Incorrect directory ${options.directory}`);
			}

			absoluteDirectoryPath = path.resolve(process.cwd(), options.directory);

			if (fs.existsSync(absoluteDirectoryPath)) {
				throw new Error(`Directory ${absoluteDirectoryPath} exists`);
			}
		});

		registerAction('saveResource', async ({resource}) => {
			const filename = path.join(absoluteDirectoryPath, resource.getFilename());
			const text = resource.getText();
			await fs.outputFile(filename, text, { encoding: 'binary' });
			loadedResources.push(resource);
		});

		registerAction('error', async ({error}) => {
			if (loadedResources.length > 0) {
				await fs.remove(absoluteDirectoryPath);
			}
		});
	}
};
