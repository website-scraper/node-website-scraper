import * as chai from 'chai';
chai.should();
const should = chai.should();
import {
	isUrl, getUrl, getUnixPath, getFilenameFromUrl,
	getFilepathFromUrl, getHashFromUrl, getRelativePath,
	shortenFilename, prettifyFilename,
	isUriSchemaSupported, urlsEqual,
	normalizeUrl, getCharsetFromCss
} from '../../../lib/utils/index.js';

describe('Utils', function () {
	describe('#isUrl(url)', function () {
		it('should return true if url starts with "http[s]://"', function () {
			isUrl('http://google.com').should.be.true;
			isUrl('https://github.com').should.be.true;
		});
		it('should return true if url starts with "//"', function () {
			isUrl('//www.youtube.com').should.be.true;
		});
		it('should return false if url starts neither with "http[s]://" nor "//"', function () {
			isUrl('http//www.youtube.com').should.be.false;
			isUrl('http:/www.youtube.com').should.be.false;
			isUrl('htt://www.youtube.com').should.be.false;
			isUrl('://www.youtube.com').should.be.false;
			isUrl('www.youtube.com').should.be.false;
		});
	});

	describe('#getUrl(url, path)', function () {
		it('should return url + path if path is not url', function () {
			getUrl('http://google.com', '/path').should.equal('http://google.com/path');
			getUrl('http://google.com/qwe/qwe/qwe', '/path').should.equal('http://google.com/path');
			getUrl('http://google.com?kjrdrgek=dmskl', '/path').should.equal('http://google.com/path');
		});
		it('should return path if it is url', function () {
			getUrl('http://google.com', 'http://my.site.com/').should.equal('http://my.site.com/');
			getUrl('http://google.com/qwe/qwe/qwe', '//my.site.com').should.equal('http://my.site.com/');
		});
		it('should use the protocol from the url, if the path is a protocol-less url', function () {
			getUrl('http://my.site.com', '//cdn.com/library.js').should.equal('http://cdn.com/library.js');
			getUrl('https://my.site.com', '//cdn.com/library.js').should.equal('https://cdn.com/library.js');
		});
	});

	describe('#getUnixPath(path)', function () {
		it('should convert to unix format for windows', function () {
			getUnixPath('D:\\Projects\\node-website-scraper').should.equal('D:/Projects/node-website-scraper');
		});
		it('should return unconverted path for unix', function () {
			getUnixPath('/home/sophia/projects/node-website-scraper').should.equal('/home/sophia/projects/node-website-scraper');
		});
	});

	describe('#getFilenameFromUrl(url)', function () {
		it('should return last path item as filename & trim all after first ? or #', function () {
			getFilenameFromUrl('http://example.com/index.html').should.equal('index.html');
			getFilenameFromUrl('http://example.com/p/a/t/h/index.html').should.equal('index.html');
			getFilenameFromUrl('http://example.com/index.html?12').should.equal('index.html');
			getFilenameFromUrl('http://example.com/index.html#t?12').should.equal('index.html');
			getFilenameFromUrl('http://example.com/index.html?12#t').should.equal('index.html');
			getFilenameFromUrl('http://example.com/?12_jdlsk').should.equal('');
			getFilenameFromUrl('http://example.com/#index.html').should.equal('');
			getFilenameFromUrl('http://example.com/').should.equal('');
		});
		it('should return unconverted filename if there are no ?,#', function () {
			getFilenameFromUrl('index.html').should.equal('index.html');
		});
		it('should decode escaped chars', function () {
			getFilenameFromUrl('https://example.co/logo-mobile%20(1).svg?q=650').should.equal('logo-mobile (1).svg');
		});
	});

	describe('#getFilepathFromUrl', function () {
		it('should return empty sting if url has no pathname', function() {
			getFilepathFromUrl('http://example.com').should.equal('');
			getFilepathFromUrl('http://example.com/').should.equal('');
			getFilepathFromUrl('http://example.com?').should.equal('');
			getFilepathFromUrl('http://example.com?abc=3').should.equal('');
			getFilepathFromUrl('http://example.com#').should.equal('');
			getFilepathFromUrl('http://example.com#test').should.equal('');
		});
		it('should return path if url has pathname', function() {
			getFilepathFromUrl('http://example.com/some/path').should.equal('some/path');
		});
		it('should return path including filename if url has pathname', function() {
			getFilepathFromUrl('http://example.com/some/path/file.js').should.equal('some/path/file.js');
		});
		it('should not contain trailing slash', function() {
			getFilepathFromUrl('http://example.com/some/path/').should.equal('some/path');
			getFilepathFromUrl('http://example.com/some/path/file.css/').should.equal('some/path/file.css');
		});
		it('should normalize slashes', function() {
			getFilepathFromUrl('http://example.com///some//path').should.equal('some/path');
			getFilepathFromUrl('http://example.com//////////file.css/').should.equal('file.css');
		});
		it('should decode escaped chars', function () {
			getFilepathFromUrl('https://example.co/logo/logo-mobile%20(1).svg?q=650').should.equal('logo/logo-mobile (1).svg');
		});
		it('should return path as is if url is malformed', () => {
			getFilepathFromUrl('https://example.co/%%IMAGE%%/logo.png').should.equal('%%IMAGE%%/logo.png');
		});
	});

	describe('#getHashFromUrl', function () {
		it('should return hash from url', function () {
			getHashFromUrl('#').should.equal('#');
			getHashFromUrl('#hash').should.equal('#hash');
			getHashFromUrl('page.html#hash').should.equal('#hash');
			getHashFromUrl('http://example.com/page.html#hash').should.equal('#hash');
		});

		it('should return empty string if url doesn\'t contain hash', function () {
			getHashFromUrl('').should.equal('');
			getHashFromUrl('page.html?a=b').should.equal('');
			getHashFromUrl('http://example.com/page.html?a=b').should.equal('');
		});
	});

	describe('#getRelativePath', function () {
		it('should return relative path', function () {
			getRelativePath('css/1.css', 'img/1.png').should.equal('../img/1.png');
			getRelativePath('index.html', 'img/1.png').should.equal('img/1.png');
			getRelativePath('css/1.css', 'css/2.css').should.equal('2.css');
		});
		it('should escape path components with encodeURIComponent', function () {
			getRelativePath('index.html', 'a/css?family=Open+Sans:300,400,600,700&lang=en').should.equal('a/css%3Ffamily%3DOpen%2BSans%3A300%2C400%2C600%2C700%26lang%3Den');
		});
		it('should also escape [\'()]', function () {
			getRelativePath('index.html', '\'single quote for html attrs\'').should.equal('%27single%20quote%20for%20html%20attrs%27');
			getRelativePath('index.html', '(parenthesizes for css url)').should.equal('%28parenthesizes%20for%20css%20url%29');
		});
	});

	describe('#shortenFilename', function() {
		it('should leave file with length < 255 as is', function() {
			var f1 = new Array(25).fill('a').join('');
			f1.length.should.eql(25);
			shortenFilename(f1).should.eql(f1);

			var f2 = new Array(25).fill('a').join('') + '.txt';
			f2.length.should.eql(29);
			shortenFilename(f2).should.eql(f2);
		});

		it('should shorten file with length = 255', function() {
			var f1 = new Array(255).fill('a').join('');
			f1.length.should.eql(255);
			shortenFilename(f1).length.should.be.lessThan(255);
		});

		it('should shorten file with length > 255', function() {
			var f1 = new Array(1255).fill('a').join('');
			f1.length.should.eql(1255);
			shortenFilename(f1).length.should.be.lessThan(255);
		});

		it('should shorten file with length = 255 and keep extension', function() {
			var f1 = new Array(251).fill('a').join('') + '.txt';
			f1.length.should.eql(255);
			shortenFilename(f1).length.should.be.lessThan(255);
			shortenFilename(f1).split('.')[1].should.eql('txt');
		});

		it('should shorten file with length > 255 and keep extension', function() {
			var f1 = new Array(1251).fill('a').join('') + '.txt';
			f1.length.should.eql(1255);
			shortenFilename(f1).length.should.be.lessThan(255);
			shortenFilename(f1).split('.')[1].should.eql('txt');
		});

		it('should shorten file with length > 255 to have basename length 20 chars', function() {
			var f1 = new Array(500).fill('a').join('');
			f1.length.should.eql(500);
			shortenFilename(f1).split('.')[0].length.should.eql(20);

			var f2 = new Array(500).fill('a').join('') + '.txt';
			f2.length.should.eql(504);
			shortenFilename(f2).split('.')[0].length.should.eql(20);
		});
	});

	describe('#prettifyFilename', () => {
		it('should delete default filename if filename === defaultFilename', () => {
			prettifyFilename('index.html', {defaultFilename: 'index.html'}).should.eql('');
		});

		it('should delete default filename if filename ends with defaultFilename', () => {
			prettifyFilename('somepage/index.html', {defaultFilename: 'index.html'}).should.eql('somepage/');
		});

		it('should not prettify if defaultFilename is part of filename', () => {
			prettifyFilename('somepageindex.html', {defaultFilename: 'index.html'}).should.eql('somepageindex.html');
		});
	});

	describe('#isUriSchemaSupported', function() {
		it('should return false for mailto:', function() {
			isUriSchemaSupported('mailto:test@test.com').should.eql(false);
		});

		it('should return false for javascript:', function() {
			isUriSchemaSupported('javascript:alert("Hi!")').should.eql(false);
		});

		it('should return false for skype:', function() {
			isUriSchemaSupported('skype:skype_name?action').should.eql(false);
		});

		it('should return true for http:', function() {
			isUriSchemaSupported('http://example.com').should.eql(true);
		});

		it('should return true for https:', function() {
			isUriSchemaSupported('https://example.com').should.eql(true);
		});

		it('should return true for relative paths', function() {
			isUriSchemaSupported('index.html').should.eql(true);
		});
	});

	describe('#urlsEqual', () => {
		it('should return false for /path and /path/', function() {
			urlsEqual('http://example.com/path', 'http://example.com/path/').should.eql(false);
		});
	});

	describe('#normalizeUrl', () => {
		it('should return original url if it is malformed', () => {
			const malformedUrl = 'http://example.com/%%IMAGEURL%%/bar1q2blitz.png';
			normalizeUrl(malformedUrl).should.eql(malformedUrl);
		});
	});

	describe('#getCharsetFromCss', () => {
		it('should return charset from the beginning of css (inside double quotes)', () => {
			const cssText = '@charset "UTF-8"; ';
			getCharsetFromCss(cssText).should.eql('utf-8');
		});

		it('should return charset from the beginning of css (inside single quotes)', () => {
			const cssText = `@charset 'UTF-8'; `;
			getCharsetFromCss(cssText).should.eql('utf-8');
		});

		it('should return null if no charset', () => {
			should.equal(getCharsetFromCss(`h1 {color: red};`), null);
		});

		it('should return null if charset is not valid', () => {
			should.equal(getCharsetFromCss('@charset  "UTF-8"; '), null);
			should.equal(getCharsetFromCss('  @charset  "UTF-8"; '), null);
			should.equal(getCharsetFromCss('@charset UTF-8;'), null);
			should.equal(getCharsetFromCss('h1 {color: red}; @charset "UTF-8";'), null);
		});
	});
});
