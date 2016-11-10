var should = require('should');
var _ = require('lodash');
var utils = require('../../lib/utils');
var Promise = require('bluebird');

describe('Common utils', function () {
	describe('#isUrl(url)', function () {
		it('should return true if url starts with "http[s]://"', function () {
			utils.isUrl('http://google.com').should.be.true();
			utils.isUrl('https://github.com').should.be.true();
		});
		it('should return true if url starts with "//"', function () {
			utils.isUrl('//www.youtube.com').should.be.true();
		});
		it('should return false if url starts neither with "http[s]://" nor "//"', function () {
			utils.isUrl('http//www.youtube.com').should.be.false();
			utils.isUrl('http:/www.youtube.com').should.be.false();
			utils.isUrl('htt://www.youtube.com').should.be.false();
			utils.isUrl('://www.youtube.com').should.be.false();
			utils.isUrl('www.youtube.com').should.be.false();
		});
	});

	describe('#getUrl(url, path)', function () {
		it('should return url + path if path is not url', function () {
			utils.getUrl('http://google.com', '/path').should.be.equal('http://google.com/path');
			utils.getUrl('http://google.com/qwe/qwe/qwe', '/path').should.be.equal('http://google.com/path');
			utils.getUrl('http://google.com?kjrdrgek=dmskl', '/path').should.be.equal('http://google.com/path');
		});
		it('should return path if it is url', function () {
			utils.getUrl('http://google.com', 'http://my.site.com/').should.be.equal('http://my.site.com/');
			utils.getUrl('http://google.com/qwe/qwe/qwe', '//my.site.com').should.be.equal('http://my.site.com/');
		});
		it('should use the protocol from the url, if the path is a protocol-less url', function (){
			utils.getUrl('http://my.site.com', '//cdn.com/library.js').should.be.equal('http://cdn.com/library.js');
			utils.getUrl('https://my.site.com', '//cdn.com/library.js').should.be.equal('https://cdn.com/library.js');
		});
	});

	describe('#getUnixPath(path)', function () {
		it('should convert to unix format for windows', function () {
			utils.getUnixPath('D:\\Projects\\node-website-scraper').should.be.equal('D:/Projects/node-website-scraper');
		});
		it('should return unconverted path for unix', function () {
			utils.getUnixPath('/home/sophia/projects/node-website-scraper').should.be.equal('/home/sophia/projects/node-website-scraper');
		});
	});

	describe('#getFilenameFromUrl(url)', function () {
		it('should return last path item as filename & trim all after first ? or #', function () {
			utils.getFilenameFromUrl('http://example.com/index.html').should.equalFileSystemPath('index.html');
			utils.getFilenameFromUrl('http://example.com/p/a/t/h/index.html').should.equalFileSystemPath('index.html');
			utils.getFilenameFromUrl('http://example.com/index.html?12').should.equalFileSystemPath('index.html');
			utils.getFilenameFromUrl('http://example.com/index.html#t?12').should.equalFileSystemPath('index.html');
			utils.getFilenameFromUrl('http://example.com/index.html?12#t').should.equalFileSystemPath('index.html');
			utils.getFilenameFromUrl('http://example.com/?12_jdlsk').should.be.empty();
			utils.getFilenameFromUrl('http://example.com/#index.html').should.be.empty();
			utils.getFilenameFromUrl('http://example.com/').should.be.empty();
		});
		it('should return unconverted filename if there are no ?,#', function () {
			utils.getFilenameFromUrl('index.html').should.equalFileSystemPath('index.html');
		});
	});

	describe('#getFilepathFromUrl', function () {
		it('should return empty sting if url has no pathname', function() {
			utils.getFilepathFromUrl('http://example.com').should.be.empty();
			utils.getFilepathFromUrl('http://example.com/').should.be.empty();
			utils.getFilepathFromUrl('http://example.com?').should.be.empty();
			utils.getFilepathFromUrl('http://example.com?abc=3').should.be.empty();
			utils.getFilepathFromUrl('http://example.com#').should.be.empty();
			utils.getFilepathFromUrl('http://example.com#test').should.be.empty();
		});
		it('should return path if url has pathname', function() {
			utils.getFilepathFromUrl('http://example.com/some/path').should.equal('some/path');
		});
		it('should return path including filename if url has pathname', function() {
			utils.getFilepathFromUrl('http://example.com/some/path/file.js').should.equal('some/path/file.js');
		});
		it('should not contain trailing slash', function() {
			utils.getFilepathFromUrl('http://example.com/some/path/').should.equal('some/path');
			utils.getFilepathFromUrl('http://example.com/some/path/file.css/').should.equal('some/path/file.css');
		});
	});

	describe('#getHashFromUrl', function () {
		it('should return hash from url', function () {
			utils.getHashFromUrl('#').should.be.equal('#');
			utils.getHashFromUrl('#hash').should.be.equal('#hash');
			utils.getHashFromUrl('page.html#hash').should.be.equal('#hash');
			utils.getHashFromUrl('http://example.com/page.html#hash').should.be.equal('#hash');
		});

		it('should return empty string if url doesn\'t contain hash', function () {
			utils.getHashFromUrl('').should.be.equal('');
			utils.getHashFromUrl('page.html?a=b').should.be.equal('');
			utils.getHashFromUrl('http://example.com/page.html?a=b').should.be.equal('');
		});
	});

	describe('#getRelativePath', function () {
		it('should return relative path', function () {
			utils.getRelativePath('css/1.css', 'img/1.png').should.be.equal('../img/1.png');
			utils.getRelativePath('index.html', 'img/1.png').should.be.equal('img/1.png');
			utils.getRelativePath('css/1.css', 'css/2.css').should.be.equal('2.css');
		});
	});

	describe('#shortenFilename', function() {
		it('should leave file with length < 255 as is', function() {
			var f1 = _.repeat('a', 25);
			should(f1.length).be.eql(25);
			should(utils.shortenFilename(f1)).be.eql(f1);

			var f2 = _.repeat('a', 25) + '.txt';
			should(f2.length).be.eql(29);
			should(utils.shortenFilename(f2)).be.eql(f2);
		});

		it('should shorten file with length = 255', function() {
			var f1 = _.repeat('a', 255);
			should(f1.length).be.eql(255);
			should(utils.shortenFilename(f1).length).be.lessThan(255);
		});

		it('should shorten file with length > 255', function() {
			var f1 = _.repeat('a', 1255);
			should(f1.length).be.eql(1255);
			should(utils.shortenFilename(f1).length).be.lessThan(255);
		});

		it('should shorten file with length = 255 and keep extension', function() {
			var f1 = _.repeat('a', 251) + '.txt';
			should(f1.length).be.eql(255);
			should(utils.shortenFilename(f1).length).be.lessThan(255);
			should(utils.shortenFilename(f1).split('.')[1]).be.eql('txt');
		});

		it('should shorten file with length > 255 and keep extension', function() {
			var f1 = _.repeat('a', 1251) + '.txt';
			should(f1.length).be.eql(1255);
			should(utils.shortenFilename(f1).length).be.lessThan(255);
			should(utils.shortenFilename(f1).split('.')[1]).be.eql('txt');
		});

		it('should shorten file with length > 255 to have basename length 20 chars', function() {
			var f1 = _.repeat('a', 500);
			should(f1.length).be.eql(500);
			should(utils.shortenFilename(f1).split('.')[0].length).be.eql(20);

			var f2 = _.repeat('a', 500) + '.txt';
			should(f2.length).be.eql(504);
			should(utils.shortenFilename(f2).split('.')[0].length).be.eql(20);
		});
	});

	describe('#waitAllFulfilled', function() {
		it('should resolve when all promises are resolved', function() {
			var p1 = Promise.resolve();
			var p2 = Promise.resolve();
			return utils.waitAllFulfilled([p1, p2]).then(function() {
				should(true).be.eql(true);
			});
		});

		it('should resolve when some promises are rejected', function() {
			var p1 = Promise.resolve();
			var p2 = Promise.reject();
			return utils.waitAllFulfilled([p1, p2]).then(function() {
				should(true).be.eql(true);
			});
		});
	});
});
