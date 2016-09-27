var should = require('should');
var path = require('path');
var FSAdapter = require('../../lib/fs-adaper');

describe('FSAdapter', function () {
	describe('constructor', function() {
		it('should clone options', function() {
			var options = { a: 1, b: 2 };
			var fsAdapter = new FSAdapter(options);
			fsAdapter.options.should.deepEqual(options);
			fsAdapter.options.should.not.be.equal(options);
		});

		it('should create absolute path if directory is relative path', function () {
			var options = { directory: 'my/relative/path' };

			var fsAdapter = new FSAdapter(options);
			var expected = path.join(process.cwd(), 'my/relative/path');
			fsAdapter.options.absoluteDirectoryPath.should.equalFileSystemPath(expected);
		});

		it('should use directory if directory is absolute path', function () {
			var options = { directory: '/my/absolute/path' };
			var fsAdapter = new FSAdapter(options);
			var expected = '/my/absolute/path';
			fsAdapter.options.absoluteDirectoryPath.should.equalFileSystemPath(expected);
		});

		it('should not define absoluteDirectoryPath if no directory were passed', function () {
			var options = {};
			var fsAdapter = new FSAdapter(options);
			should(fsAdapter.options.absoluteDirectoryPath).eql(undefined);
		});
	});
});
