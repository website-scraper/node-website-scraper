'use strict';

const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const ResourceSaver = require('../../lib/resource-saver');

describe('ResourceSaver', function () {
	describe('constructor', function() {
		it('should pick supported options', function() {
			const options = { a: 1, b: 2, directory: 'myDirectory' };
			const resourceSaver = new ResourceSaver(options);
			resourceSaver.options.should.eql({directory: 'myDirectory'});
		});

		describe('absoluteDirectoryPath', () => {
			it('should create absolute path if directory is relative path', function () {
				const options = { directory: 'my/relative/path' };
				const resourceSaver = new ResourceSaver(options);
				const expected = path.join(process.cwd(), 'my/relative/path');
				resourceSaver.absoluteDirectoryPath.should.equalFileSystemPath(expected);
			});

			it('should use directory if directory is absolute path', function () {
				const options = { directory: '/my/absolute/path' };
				const resourceSaver = new ResourceSaver(options);
				const expected = '/my/absolute/path';
				resourceSaver.absoluteDirectoryPath.should.equalFileSystemPath(expected);
			});
		});

		describe('incorrect directory', () => {
			it('should throw error if no directory were passed', function () {
				const options = {};
				function createResourceSaver () {
					new ResourceSaver(options);
				}
				should(createResourceSaver).throw(/Incorrect directory/);
			});

			it('should throw error if empty directory were passed', function () {
				const options = {
					directory: ''
				};
				function createResourceSaver () {
					new ResourceSaver(options);
				}
				should(createResourceSaver).throw(/Incorrect directory/);
			});

			it('should throw error if incorrect directory passed', function () {
				const options = {
					directory: {}
				};
				function createResourceSaver () {
					new ResourceSaver(options);
				}
				should(createResourceSaver).throw(/Incorrect directory/);
			});
		});

		describe('existing directory', () => {
			it('should throw error if directory exists', () => {
				const ResourceSaver = proxyquire('../../lib/resource-saver', {
					'fs-extra': {
						statSync: sinon.stub().returns('fake-stat')
					}
				});

				const options = {
					directory: 'fake-directory'
				};
				function createResourceSaver () {
					new ResourceSaver(options);
				}
				should(createResourceSaver).throw(/Directory (.*?) exists/);
			});

			it('should throw other errors as is', () => {
				const ResourceSaver = proxyquire('../../lib/resource-saver', {
					'fs-extra': {
						statSync: sinon.stub().throws(new Error('other fs error'))
					}
				});

				const options = {
					directory: 'fake-directory'
				};
				function createResourceSaver () {
					new ResourceSaver(options);
				}
				should(createResourceSaver).throw('other fs error');
			});
		});

	});
});
