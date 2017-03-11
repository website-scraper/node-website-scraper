var _ = require('lodash');
var should = require('should');
require('../../utils/assertions');
var sinon = require('sinon');
var Resource = require('../../../lib/resource');
var byTypeFilenameGenerator = require('../../../lib/filename-generator/by-type');

describe('FilenameGenerator: byType', function() {
	it('should return resource filename', function() {
		var r = new Resource('http://example.com/a.png', 'b.png');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('b.png');
	});

	it('should return url-based filename if resource has no filename', function() {
		var r = new Resource('http://example.com/a.png');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('a.png');
	});

	it('should return url-based filename if resource has empty filename', function() {
		var r = new Resource('http://example.com/a.png', '');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('a.png');
	});

	it('should add missed extensions for html resources', function () {
		var r = new Resource('http://example.com/about', '');
		r.getType = sinon.stub().returns('html');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('about.html');
	});

	it('should add missed extensions for css resources', function () {
		var r = new Resource('http://example.com/css', '');
		r.getType = sinon.stub().returns('css');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('css.css');
	});

	it('should not add missed extensions for other resources', function () {
		var r = new Resource('http://1.gravatar.com/avatar/4d63e4a045c7ff22accc33dc08442f86?s=140&amp;d=%2Fwp-content%2Fuploads%2F2015%2F05%2FGood-JOb-150x150.jpg&amp;r=g', '');
		r.getType = sinon.stub().returns('home');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('4d63e4a045c7ff22accc33dc08442f86');
	});

	it('should return filename with correct subdirectory', function() {
		var options = {
			subdirectories: [
				{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] }
			]
		};

		var r = new Resource('http://example.com/a.png');
		var filename = byTypeFilenameGenerator(r, options, []);
		filename.should.equalFileSystemPath('img/a.png');
	});

    it('should return filename with correct subdirectory when string cases are different', function() {
        var options = {
            subdirectories: [
                { directory: 'img', extensions: ['.png'] }
            ]
        };

        var r = new Resource('http://example.com/a.PNG');
        var f = byTypeFilenameGenerator(r, options, []);
        f.should.equalFileSystemPath('img/a.PNG');
    });

	it('should return different filename if desired filename is occupied', function() {
		var r = new Resource('http://second-example.com/a.png');
		var filename = byTypeFilenameGenerator(r, {}, [ 'a.png' ]);
		filename.should.not.equalFileSystemPath('a.png');
	});

	it('should return different filename if desired filename is occupied N times', function() {
		var occupiedFilenames = [];
		var r1 = new Resource('http://first-example.com/a.png');
		var r2 = new Resource('http://second-example.com/a.png');
		var r3 = new Resource('http://third-example.com/a.png');
		var r4 = new Resource('http://fourth-example.com/a.png');

		var f1 = byTypeFilenameGenerator(r1, {}, occupiedFilenames);
		f1.should.equalFileSystemPath('a.png');
		occupiedFilenames.push(f1);

		var f2 = byTypeFilenameGenerator(r2, {}, occupiedFilenames);
		f2.should.not.equal(f1);
		occupiedFilenames.push(f2);

		var f3 = byTypeFilenameGenerator(r3, {}, occupiedFilenames);
		f3.should.not.equal(f1);
		f3.should.not.equal(f2);
		occupiedFilenames.push(f3);

		var f4 = byTypeFilenameGenerator(r4, {}, occupiedFilenames);
		f4.should.not.equal(f1);
		f4.should.not.equal(f2);
		f4.should.not.equal(f3);
	});

	it('should shorten filename', function() {
		var resourceFilename = _.repeat('a', 1000) + '.png';
		var r = new Resource('http://example.com/a.png', resourceFilename);
		var filename = byTypeFilenameGenerator(r, {}, []);
		should(filename.length).be.lessThan(255);
	});

	it('should return different short filename if first short filename is occupied', function() {
		var resourceFilename = _.repeat('a', 1000) + '.png';

		var r1 = new Resource('http://first-example.com/a.png', resourceFilename);
		var r2 = new Resource('http://second-example.com/a.png', resourceFilename);

		var f1 = byTypeFilenameGenerator(r1, {}, []);
		should(f1.length).be.lessThan(255);

		var f2 = byTypeFilenameGenerator(r2, {}, [ f1 ]);
		should(f2.length).be.lessThan(255);
		should(f2).not.be.eql(f1);

		should(f2).not.be.eql(f1);
	});

	it('should return decoded url-based filename', function() {
		var r = new Resource('https://developer.mozilla.org/ru/docs/JavaScript_%D1%88%D0%B5%D0%BB%D0%BB%D1%8B');
		var filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('JavaScript_шеллы');

		var r2 = new Resource('https://developer.mozilla.org/Hello%20G%C3%BCnter.png');
		var filename2 = byTypeFilenameGenerator(r2, {}, []);
		filename2.should.equalFileSystemPath('Hello Günter.png');
	});
});
