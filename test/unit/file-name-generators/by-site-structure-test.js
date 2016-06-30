require('should');
require('../../utils/assertions');
var Resource = require('../../../lib/resource');
var bySiteStructureFilenameGenerator = require('../../../lib/filename-generators/by-site-structure');

var options = { defaultFilename: 'index.html' };

describe('byStructureFilenameGenerator', function() {
	it('should return the normalized relative path of the resource url', function(){
		var r1 = new Resource('http://example.com/some/path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('some/path/a.png');

		var r2 = new Resource('http://example.com/a.png');
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('a.png');

		var r3 = new Resource('http://example.com/some/path/../images/a.png');
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('some/images/a.png');
	});

	it('should add the defaultFilename to the path, for html resources without extension', function(){
		var isHtmlMock = function(){
			return true;
		};

		var r1 = new Resource('http://example.com/some/path/');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('some/path/index.html');

		var r2 = new Resource('http://example.com/some/path');
		r2.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('some/path/index.html');

		var r3 = new Resource('http://example.com');
		r3.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('index.html');

		var r4 = new Resource('');
		r4.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r4, options).should.equalFileSystemPath('index.html');
	});

	it('should normalize to safe relative paths, without ..', function(){
		var r = new Resource('http://example.com/some/path/../../../../images/a.png');
		bySiteStructureFilenameGenerator(r, options).should.equalFileSystemPath('images/a.png');
	});

	it('should not replace thrice dot in filenames', function() {
		// if it replaces them we receive 'some/path/../../../../etc/passwd'
		// path.resolve('some/path/../../../../etc/passwd'); = '/etc/passwd' => which is not safe
		var r = new Resource('http://example.com/some/path/.../.../.../.../etc/passwd');
		bySiteStructureFilenameGenerator(r, options).should.equalFileSystemPath('some/path/.../.../.../.../etc/passwd');
	});
});
