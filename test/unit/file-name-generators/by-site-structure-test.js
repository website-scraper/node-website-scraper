require('should');
var Resource = require('../../../lib/resource');
var bySiteStructureFilenameGenerator = require('../../../lib/filename-generators/by-site-structure');

var options = { defaultFilename: 'index.html' };

describe('byStructureFilenameGenerator', function() {
	it('should return the normalized absolute path of the resource url', function(){
		var r1 = new Resource('http://example.com/some/path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equal('/some/path/a.png');

		var r2 = new Resource('http://example.com/a.png');
		bySiteStructureFilenameGenerator(r2, options).should.equal('/a.png');

		var r3 = new Resource('http://example.com/some/path/../images/a.png');
		bySiteStructureFilenameGenerator(r3, options).should.equal('/some/images/a.png');
	});

	it('should add the defaultFilename to the path, for html resources without extension', function(){
		var isHtmlMock = function(){
			return true;
		};

		var r1 = new Resource('http://example.com/some/path/');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equal('/some/path/index.html');

		var r2 = new Resource('http://example.com/some/path');
		r2.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r2, options).should.equal('/some/path/index.html');

		var r3 = new Resource('http://example.com');
		r3.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r3, options).should.equal('/index.html');

		var r4 = new Resource('');
		r4.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r4, options).should.equal('/index.html');
	});

	it('should normalize to safe absolute paths, without ..', function(){
		var r = new Resource('http://example.com/some/path/../../../../images/a.png');
		bySiteStructureFilenameGenerator(r, options).should.equal('/images/a.png');
	});
});
