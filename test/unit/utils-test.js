require('should');
var utils = require('../../lib/utils');

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
	});

	describe('#getUnixPath(path)', function () {
		it('should convert to unix format for windows', function () {
			utils.getUnixPath('D:\\Projects\\node-website-scraper').should.be.equal('D:/Projects/node-website-scraper');
		});
		it('should return unconverted path for unix', function () {
			utils.getUnixPath('/home/sophia/projects/node-website-scraper').should.be.equal('/home/sophia/projects/node-website-scraper');
		});
	});

	describe('#trimFilename(filename)', function () {
		it('should trim all after first ? or #', function () {
			utils.trimFilename('index.html?12').should.be.equal('index.html');
			utils.trimFilename('index.html#t?12').should.be.equal('index.html');
			utils.trimFilename('index.html?12#t').should.be.equal('index.html');
			utils.trimFilename('?12_jdlsk').should.be.empty();
			utils.trimFilename('#index.html').should.be.empty();
		});
		it('should return unconvetred filename if there are no ?,#', function () {
			utils.trimFilename('index.html').should.be.equal('index.html');
		});
	});

	describe('#getRelativePath', function () {
		it('should return relative path', function () {
			utils.getRelativePath('css/1.css', 'img/1.png').should.be.equal('../img/1.png');
			utils.getRelativePath('index.html', 'img/1.png').should.be.equal('img/1.png');
			utils.getRelativePath('css/1.css', 'css/2.css').should.be.equal('2.css');
		});
	});
});
