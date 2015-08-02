require('should');
var utils = require('../../lib/utils');

describe('Common utils', function () {
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

	describe('#getFilenameFromUrl(url)', function () {
		it('should return last path item as filename & trim all after first ? or #', function () {
			utils.getFilenameFromUrl('http://example.com/index.html').should.be.equal('index.html');
			utils.getFilenameFromUrl('http://example.com/p/a/t/h/index.html').should.be.equal('index.html');
			utils.getFilenameFromUrl('http://example.com/index.html?12').should.be.equal('index.html');
			utils.getFilenameFromUrl('http://example.com/index.html#t?12').should.be.equal('index.html');
			utils.getFilenameFromUrl('http://example.com/index.html?12#t').should.be.equal('index.html');
			utils.getFilenameFromUrl('http://example.com/?12_jdlsk').should.be.empty();
			utils.getFilenameFromUrl('http://example.com/#index.html').should.be.empty();
			utils.getFilenameFromUrl('http://example.com/').should.be.empty();
		});
		it('should return unconvetred filename if there are no ?,#', function () {
			utils.getFilenameFromUrl('index.html').should.be.equal('index.html');
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
