const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');

const fs = require('fs-extra');
const outputFileAsync = Promise.promisify(fs.outputFile);
const removeAsync = Promise.promisify(fs.remove);

const supportedOptions = [ 'directory' ];

class FSAdapter {
	constructor(options) {
		this.options = _.pick(options, supportedOptions);

		if (!this.options.directory || !_.isString(this.options.directory)) {
			throw new Error('Incorrect directory ' + this.options.directory);
		}

		this.absoluteDirectoryPath = path.resolve(process.cwd(), this.options.directory);

		if (exists(this.absoluteDirectoryPath)) {
			throw new Error('Directory ' + this.absoluteDirectoryPath + ' exists');
		}

		this.loadedResources = [];
	}

	saveResource (resource) {
		const filename = path.join(this.absoluteDirectoryPath, resource.getFilename());
		const text = resource.getText();
		return outputFileAsync(filename, text, { encoding: 'binary' }).then(() => {
			this.loadedResources.push(resource);
		});
	}

	handleError () {
		if (!_.isEmpty(this.loadedResources)) {
			return removeAsync(this.absoluteDirectoryPath);
		}
		return Promise.resolve();
	}
}

function exists (path) {
	let exists;
	try {
		if (fs.statSync(path)) {
			exists = true;
		}
	} catch (e) {
		if (e.code === 'ENOENT') {
			exists = false;
		} else {
			throw e;
		}
	}

	return exists;
}

module.exports = FSAdapter;
