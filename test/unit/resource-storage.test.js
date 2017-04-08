'use strict';

const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const ResourceStorage = require('../../lib/resource-storage');

describe('ResourceStorage', function () {
	describe('constructor', function() {
		it('should pick supported options', function() {
			const options = { a: 1, b: 2, directory: 'myDirectory' };
			const resourceStorage = new ResourceStorage(options);
			resourceStorage.options.should.eql({directory: 'myDirectory'});
		});

		describe('absoluteDirectoryPath', () => {
			it('should create absolute path if directory is relative path', function () {
				const options = { directory: 'my/relative/path' };
				const resourceStorage = new ResourceStorage(options);
				const expected = path.join(process.cwd(), 'my/relative/path');
				resourceStorage.absoluteDirectoryPath.should.equalFileSystemPath(expected);
			});

			it('should use directory if directory is absolute path', function () {
				const options = { directory: '/my/absolute/path' };
				const resourceStorage = new ResourceStorage(options);
				const expected = '/my/absolute/path';
				resourceStorage.absoluteDirectoryPath.should.equalFileSystemPath(expected);
			});
		});

		describe('incorrect directory', () => {
			it('should throw error if no directory were passed', function () {
				const options = {};
				function createResourceStorage () {
					new ResourceStorage(options);
				}
				should(createResourceStorage).throw(/Incorrect directory/);
			});

			it('should throw error if empty directory were passed', function () {
				const options = {
					directory: ''
				};
				function createResourceStorage () {
					new ResourceStorage(options);
				}
				should(createResourceStorage).throw(/Incorrect directory/);
			});

			it('should throw error if incorrect directory passed', function () {
				const options = {
					directory: {}
				};
				function createResourceStorage () {
					new ResourceStorage(options);
				}
				should(createResourceStorage).throw(/Incorrect directory/);
			});
		});

		describe('existing directory', () => {
			it('should throw error if directory exists', () => {
				const ResourceStorage = proxyquire('../../lib/resource-storage', {
					'fs-extra': {
						statSync: sinon.stub().returns('fake-stat')
					}
				});

				const options = {
					directory: 'fake-directory'
				};
				function createResourceStorage () {
					new ResourceStorage(options);
				}
				should(createResourceStorage).throw(/Directory (.*?) exists/);
			});
		});

	});
});
