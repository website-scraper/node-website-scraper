import should from 'should';
import '../../utils/assertions.js';

import sinon from 'sinon';
import Resource from '../../../lib/resource.js';
import bySiteStructureFilenameGenerator from '../../../lib/filename-generator/by-site-structure.js';

const options = { defaultFilename: 'index.html' };

describe('FilenameGenerator: bySiteStructure', () => {
	it('should return the normalized relative path of the resource url', () =>{
		const r1 = new Resource('http://example.com/some/path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/a.png');

		const r2 = new Resource('http://example.com/a.png');
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/a.png');
	});

	it('should remove . and .. from path', () => {
		const r1 = new Resource('http://example.com/some/path/../images/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/images/a.png');

		const r2 = new Resource('http://example.com/some/path/../../../images/b.png');
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/images/b.png');

		const r3 = new Resource('http://example.com/some/path/./images/c.png');
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('example.com/some/path/images/c.png');
	});

	it('should replace the colon, for url with port number', () =>{
		const r1 = new Resource('http://example.com:8080/some/path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com_8080/some/path/a.png');
	});

	it('should replace not allowed characters from filename', () => {
		const r1 = new Resource('http://example.com/some/path/<*a*>.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/__a__.png');
	});

	it('should replace not allowed characters from path', () => {
		const r1 = new Resource('http://example.com/some:path/a.png');
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some_path/a.png');
	});

	it('should add the defaultFilename to the path, for html resources without extension', () =>{
		const isHtmlMock = sinon.stub().returns(true);

		const r1 = new Resource('http://example.com/some/path/');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/index.html');

		const r2 = new Resource('http://example.com/some/path');
		r2.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/some/path/index.html');

		const r3 = new Resource('http://example.com');
		r3.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('example.com/index.html');
	});

	it('should add the defaultFilename to the path, for html resources with wrong extension', () =>{
		const isHtmlMock = sinon.stub().returns(true);

		const r1 = new Resource('http://example.com/some/path/test.com');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/some/path/test.com/index.html');
	});

	it('should normalize to safe relative paths, without ..', () =>{
		const r = new Resource('http://example.com/some/path/../../../../images/a.png');
		bySiteStructureFilenameGenerator(r, options).should.equalFileSystemPath('example.com/images/a.png');
	});

	it('should shorten filename', () => {
		const resourceFilename = new Array(1000).fill('a').join('') + '.png';
		const r = new Resource('http://example.com/' + resourceFilename);
		const filename = bySiteStructureFilenameGenerator(r, options);
		should(filename.length).be.lessThan(255);
	});

	it('should shorten filename if resource is html without ext and default name is too long', () => {
		const defaultFilename = new Array(1000).fill('a').join('') + '.html';
		const r = new Resource('http://example.com/path');
		r.isHtml = sinon.stub().returns(true);
		const filepath = bySiteStructureFilenameGenerator(r, { defaultFilename: defaultFilename });
		const filenameParts = filepath.split('/');
		const filename = filenameParts[filenameParts.length - 1];
		should(filename.length).be.lessThan(255);
	});

	it('should return decoded filepath', () => {
		const r = new Resource('https://developer.mozilla.org/ru/docs/JavaScript_%D1%88%D0%B5%D0%BB%D0%BB%D1%8B');
		const filename = bySiteStructureFilenameGenerator(r, options);
		filename.should.equalFileSystemPath('developer.mozilla.org/ru/docs/JavaScript_шеллы');

		const r2 = new Resource('https://developer.mozilla.org/Hello%20G%C3%BCnter.png');
		const filename2 = bySiteStructureFilenameGenerator(r2, options);
		filename2.should.equalFileSystemPath('developer.mozilla.org/Hello Günter.png');
	});

	it('should keep query strings', () => {
		const isHtmlMock = sinon.stub().returns(true);

		const r1 = new Resource('http://example.com/path?q=test');
		r1.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r1, options).should.equalFileSystemPath('example.com/path/q=test.html');

		const r2 = new Resource('http://example.com/path?q1=test1&q2=test2');
		r2.isHtml = isHtmlMock;
		bySiteStructureFilenameGenerator(r2, options).should.equalFileSystemPath('example.com/path/q1=test1&q2=test2.html');

		const r3 = new Resource('http://example.com/path/picture.png?q1=test1&q2=test2');
		bySiteStructureFilenameGenerator(r3, options).should.equalFileSystemPath('example.com/path/picture_q1=test1&q2=test2.png');
	});
});
