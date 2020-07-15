var _ = require('lodash');
var should = require('should');
require('../../utils/assertions');
var sinon = require('sinon');
var Resource = require('../../../lib/resource');
var bySiteStructureFilenameGenerator = require('../../../lib/filename-generator/by-site-structure');

var options = { defaultFilename: 'index.html' };

describe('FilenameGenerator: bySiteStructure', function() {
	it('should return the normalized relative path of the resource url', function(){
		var r1 = new Resource('http://example.com/some/path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/a.png');

		var r2 = new Resource('http://example.com/a.png');
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/a.png');

		var r3 = new Resource('http://example.com/some/path/../images/a.png');
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('example.com/some/images/a.png');
	});

	it('should replace the colon, for url with port number', function(){
		var r1 = new Resource('http://example.com:8080/some/path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com_8080/some/path/a.png');
	});

	it('should add the defaultFilename to the path, for html resources without extension', function(){
		var isHtmlMock = sinon.stub().returns(true);

		var r1 = new Resource('http://example.com/some/path/');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/index.html');

		var r2 = new Resource('http://example.com/some/path');
		r2.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/some/path/index.html');

		var r3 = new Resource('http://example.com');
		r3.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('example.com/index.html');
	});

	it('should add the defaultFilename to the path, for html resources with wrong extension', function(){
		var isHtmlMock = sinon.stub().returns(true);

		var r1 = new Resource('http://example.com/some/path/test.com');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/test.com/index.html');
	});

	it('should normalize to safe relative paths, without ..', function(){
		var r = new Resource('http://example.com/some/path/../../../../images/a.png');
		bySiteStructureFilenameGenerator(r, options).should.equalFileSystemPath('example.com/images/a.png');
	});

	it('should not replace thrice dot in filenames', function() {
		// if it replaces them we receive 'some/path/../../../../etc/passwd'
		// path.resolve('some/path/../../../../etc/passwd'); = '/etc/passwd' => which is not safe
		var r = new Resource('http://example.com/some/path/.../.../.../.../etc/passwd');
		bySiteStructureFilenameGenerator(r, options).should.equalFileSystemPath('example.com/some/path/.../.../.../.../etc/passwd');
	});

	it('should shorten filename', function() {
		var resourceFilename = _.repeat('1', 1000) + '.png';
		var r = new Resource('http://example.com/' + resourceFilename);
		var filename = bySiteStructureFilenameGenerator(r, options);
		should(filename.length).be.lessThan(255);
	});

	it('should shorten filename if resource is html without ext and default name is too long', function() {
		var defaultFilename = _.repeat('1', 1000) + '.html';
		var r = new Resource('http://example.com/path');
		r.isHtml = sinon.stub().returns(true);
		var filepath = bySiteStructureFilenameGenerator(r, { defaultFilename: defaultFilename });
		var filename = _.last(filepath.split('/'));
		should(filename.length).be.lessThan(255);
	});

	it('should return decoded filepath', function() {
		var r = new Resource('https://developer.mozilla.org/ru/docs/JavaScript_%D1%88%D0%B5%D0%BB%D0%BB%D1%8B');
		var filename = bySiteStructureFilenameGenerator(r, options);
		filename.should.equalFileSystemPath('developer.mozilla.org/ru/docs/JavaScript_шеллы');

		var r2 = new Resource('https://developer.mozilla.org/Hello%20G%C3%BCnter.png');
		var filename2 = bySiteStructureFilenameGenerator(r2, options);
		filename2.should.equalFileSystemPath('developer.mozilla.org/Hello Günter.png');
	});

	it('should keep query strings', function () {
		var isHtmlMock = sinon.stub().returns(true);

		var r1 = new Resource('http://example.com/path?q=test');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/path/q=test.html');

		var r2 = new Resource('http://example.com/path?q1=test1&q2=test2');
		r2.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/path/q1=test1&q2=test2.html');

		var r3 = new Resource('http://example.com/path/picture.png?q1=test1&q2=test2');
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('example.com/path/picture_q1=test1&q2=test2.png');
	})
});
