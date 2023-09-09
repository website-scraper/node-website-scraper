import should from 'should';
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
			isUrl('http://google.com').should.be.true();
			isUrl('https://github.com').should.be.true();
		});
		it('should return true if url starts with "//"', function () {
			isUrl('//www.youtube.com').should.be.true();
		});
		it('should return false if url starts neither with "http[s]://" nor "//"', function () {
			isUrl('http//www.youtube.com').should.be.false();
			isUrl('http:/www.youtube.com').should.be.false();
			isUrl('htt://www.youtube.com').should.be.false();
			isUrl('://www.youtube.com').should.be.false();
			isUrl('www.youtube.com').should.be.false();
		});
	});

	describe('#getUrl(url, path)', function () {
		it('should return url + path if path is not url', function () {
			getUrl('http://google.com', '/path').should.be.equal('http://google.com/path');
			getUrl('http://google.com/qwe/qwe/qwe', '/path').should.be.equal('http://google.com/path');
			getUrl('http://google.com?kjrdrgek=dmskl', '/path').should.be.equal('http://google.com/path');
		});
		it('should return path if it is url', function () {
			getUrl('http://google.com', 'http://my.site.com/').should.be.equal('http://my.site.com/');
			getUrl('http://google.com/qwe/qwe/qwe', '//my.site.com').should.be.equal('http://my.site.com/');
		});
		it('should use the protocol from the url, if the path is a protocol-less url', function () {
			getUrl('http://my.site.com', '//cdn.com/library.js').should.be.equal('http://cdn.com/library.js');
			getUrl('https://my.site.com', '//cdn.com/library.js').should.be.equal('https://cdn.com/library.js');
		});
	});

	describe('#getUnixPath(path)', function () {
		it('should convert to unix format for windows', function () {
			getUnixPath('D:\\Projects\\node-website-scraper').should.be.equal('D:/Projects/node-website-scraper');
		});
		it('should return unconverted path for unix', function () {
			getUnixPath('/home/sophia/projects/node-website-scraper').should.be.equal('/home/sophia/projects/node-website-scraper');
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
			getHashFromUrl('#').should.be.equal('#');
			getHashFromUrl('#hash').should.be.equal('#hash');
			getHashFromUrl('page.html#hash').should.be.equal('#hash');
			getHashFromUrl('http://example.com/page.html#hash').should.be.equal('#hash');
		});

		it('should return empty string if url doesn\'t contain hash', function () {
			getHashFromUrl('').should.be.equal('');
			getHashFromUrl('page.html?a=b').should.be.equal('');
			getHashFromUrl('http://example.com/page.html?a=b').should.be.equal('');
		});
	});

	describe('#getRelativePath', function () {
		it('should return relative path', function () {
			getRelativePath('css/1.css', 'img/1.png').should.be.equal('../img/1.png');
			getRelativePath('index.html', 'img/1.png').should.be.equal('img/1.png');
			getRelativePath('css/1.css', 'css/2.css').should.be.equal('2.css');
		});
		it('should escape path components with encodeURIComponent', function () {
			getRelativePath('index.html', 'a/css?family=Open+Sans:300,400,600,700&lang=en').should.be.equal('a/css%3Ffamily%3DOpen%2BSans%3A300%2C400%2C600%2C700%26lang%3Den');
		});
		it('should also escape [\'()]', function () {
			getRelativePath('index.html', '\'single quote for html attrs\'').should.be.equal('%27single%20quote%20for%20html%20attrs%27');
			getRelativePath('index.html', '(parenthesizes for css url)').should.be.equal('%28parenthesizes%20for%20css%20url%29');
		});
	});

	describe('#shortenFilename', function() {
		it('should leave file with length < 255 as is', function() {
			var f1 = new Array(25).fill('a').join('');
			should(f1.length).be.eql(25);
			should(shortenFilename(f1)).be.eql(f1);

			var f2 = new Array(25).fill('a').join('') + '.txt';
			should(f2.length).be.eql(29);
			should(shortenFilename(f2)).be.eql(f2);
		});

		it('should shorten file with length = 255', function() {
			var f1 = new Array(255).fill('a').join('');
			should(f1.length).be.eql(255);
			should(shortenFilename(f1).length).be.lessThan(255);
		});

		it('should shorten file with length > 255', function() {
			var f1 = new Array(1255).fill('a').join('');
			should(f1.length).be.eql(1255);
			should(shortenFilename(f1).length).be.lessThan(255);
		});

		it('should shorten file with length = 255 and keep extension', function() {
			var f1 = new Array(251).fill('a').join('') + '.txt';
			should(f1.length).be.eql(255);
			should(shortenFilename(f1).length).be.lessThan(255);
			should(shortenFilename(f1).split('.')[1]).be.eql('txt');
		});

		it('should shorten file with length > 255 and keep extension', function() {
			var f1 = new Array(1251).fill('a').join('') + '.txt';
			should(f1.length).be.eql(1255);
			should(shortenFilename(f1).length).be.lessThan(255);
			should(shortenFilename(f1).split('.')[1]).be.eql('txt');
		});

		it('should shorten file with length > 255 to have basename length 20 chars', function() {
			var f1 = new Array(500).fill('a').join('');
			should(f1.length).be.eql(500);
			should(shortenFilename(f1).split('.')[0].length).be.eql(20);

			var f2 = new Array(500).fill('a').join('') + '.txt';
			should(f2.length).be.eql(504);
			should(shortenFilename(f2).split('.')[0].length).be.eql(20);
		});
	});

	describe('#prettifyFilename', () => {
		it('should delete default filename if filename === defaultFilename', () => {
			should(prettifyFilename('index.html', {defaultFilename: 'index.html'})).be.eql('');
		});

		it('should delete default filename if filename ends with defaultFilename', () => {
			should(prettifyFilename('somepage/index.html', {defaultFilename: 'index.html'})).be.eql('somepage/');
		});

		it('should not prettify if defaultFilename is part of filename', () => {
			should(prettifyFilename('somepageindex.html', {defaultFilename: 'index.html'})).be.eql('somepageindex.html');
		});
	});

	describe('#isUriSchemaSupported', function() {
		it('should return false for mailto:', function() {
			should(isUriSchemaSupported('mailto:test@test.com')).be.eql(false);
		});

		it('should return false for javascript:', function() {
			should(isUriSchemaSupported('javascript:alert("Hi!")')).be.eql(false);
		});

		it('should return false for skype:', function() {
			should(isUriSchemaSupported('skype:skype_name?action')).be.eql(false);
		});

		it('should return true for http:', function() {
			should(isUriSchemaSupported('http://example.com')).be.eql(true);
		});

		it('should return true for https:', function() {
			should(isUriSchemaSupported('https://example.com')).be.eql(true);
		});

		it('should return true for relative paths', function() {
			should(isUriSchemaSupported('index.html')).be.eql(true);
		});
	});

	describe('#urlsEqual', () => {
		it('should return false for /path and /path/', function() {
			should(urlsEqual('http://example.com/path', 'http://example.com/path/')).be.eql(false);
		});
	});

	describe('#normalizeUrl', () => {
		it('should return original url if it is malformed', () => {
			const malformedUrl = 'http://example.com/%%IMAGEURL%%/bar1q2blitz.png';
			should(normalizeUrl(malformedUrl)).be.eql(malformedUrl);
		});
	});

	describe('#getCharsetFromCss', () => {
		it('should return charset from the beginning of css (inside double quotes)', () => {
			const cssText = '@charset "UTF-8"; ';
			should(getCharsetFromCss(cssText)).be.eql('utf-8');
		});

		it('should return charset from the beginning of css (inside single quotes)', () => {
			const cssText = `@charset 'UTF-8'; `;
			should(getCharsetFromCss(cssText)).be.eql('utf-8');
		});

		it('should return null if no charset', () => {
			const cssText = `h1 {color: red};`;
			should(getCharsetFromCss(cssText)).be.eql(null);
		});

		it('should return null if charset is not valid', () => {
			should(getCharsetFromCss('@charset  "UTF-8"; ')).be.eql(null);
			should(getCharsetFromCss('  @charset  "UTF-8"; ')).be.eql(null);
			should(getCharsetFromCss('@charset UTF-8;')).be.eql(null);
			should(getCharsetFromCss('h1 {color: red}; @charset "UTF-8";')).be.eql(null);
		});
	});
});
