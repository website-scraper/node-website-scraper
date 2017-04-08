'use strict';

const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const FSAdapter = require('../../lib/fs-adaper');

describe('FSAdapter', function () {
	describe('constructor', function() {
		it('should pick supported options', function() {
			const options = { a: 1, b: 2, directory: 'myDirectory' };
			const fsAdapter = new FSAdapter(options);
			fsAdapter.options.should.eql({directory: 'myDirectory'});
		});

		describe('absoluteDirectoryPath', () => {
			it('should create absolute path if directory is relative path', function () {
				const options = { directory: 'my/relative/path' };
				const fsAdapter = new FSAdapter(options);
				const expected = path.join(process.cwd(), 'my/relative/path');
				fsAdapter.absoluteDirectoryPath.should.equalFileSystemPath(expected);
			});

			it('should use directory if directory is absolute path', function () {
				const options = { directory: '/my/absolute/path' };
				const fsAdapter = new FSAdapter(options);
				const expected = '/my/absolute/path';
				fsAdapter.absoluteDirectoryPath.should.equalFileSystemPath(expected);
			});
		});

		describe('incorrect directory', () => {
			it('should throw error if no directory were passed', function () {
				const options = {};
				function createFsAdapter () {
					new FSAdapter(options);
				}
				should(createFsAdapter).throw(/Incorrect directory/);
			});

			it('should throw error if empty directory were passed', function () {
				const options = {
					directory: ''
				};
				function createFsAdapter () {
					new FSAdapter(options);
				}
				should(createFsAdapter).throw(/Incorrect directory/);
			});

			it('should throw error if incorrect directory passed', function () {
				const options = {
					directory: {}
				};
				function createFsAdapter () {
					new FSAdapter(options);
				}
				should(createFsAdapter).throw(/Incorrect directory/);
			});
		});

		describe('existing directory', () => {
			it('should throw error if directory exists', () => {
				const FSAdapter = proxyquire('../../lib/fs-adaper', {
					'fs-extra': {
						statSync: sinon.stub().returns('fake-stat')
					}
				});

				const options = {
					directory: 'fake-directory'
				};
				function createFsAdapter () {
					new FSAdapter(options);
				}
				should(createFsAdapter).throw(/Directory (.*?) exists/);
			});
		});

	});
});
