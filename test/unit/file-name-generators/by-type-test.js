require('should');
require('../../utils/assertions');
var sinon = require('sinon');
var Scraper = require('../../../lib/scraper');
var Resource = require('../../../lib/resource');
var byTypeFilenameGenerator = require('../../../lib/filename-generators/by-type');

describe('byTypeFilenameGenerator', function() {

    var s;

    beforeEach(function() {
        s = new Scraper({
            urls: 'http://example.com',
            directory: __dirname + '/.scraper-test',
            subdirectories: null
        });
    });

    it('should return resource filename', function() {
        var r = new Resource('http://example.com/a.png', 'b.png');
        var filename = byTypeFilenameGenerator(r, s.options, s.occupiedFileNames);
        filename.should.equalFileSystemPath('b.png');
    });

    it('should return url-based filename if resource has no filename', function() {
        var r = new Resource('http://example.com/a.png', '');
        var filename = byTypeFilenameGenerator(r, s.options, s.occupiedFileNames);
        filename.should.equalFileSystemPath('a.png');
    });

    it('should add missed extensions for html resources', function () {
        var r = new Resource('http://example.com/about', '');
        r.getType = sinon.stub().returns('html');
        var filename = byTypeFilenameGenerator(r, s.options, s.occupiedFileNames);
        filename.should.equalFileSystemPath('about.html');
    });

    it('should add missed extensions for css resources', function () {
        var r = new Resource('http://example.com/css', '');
        r.getType = sinon.stub().returns('css');
        var filename = byTypeFilenameGenerator(r, s.options, s.occupiedFileNames);
        filename.should.equalFileSystemPath('css.css');
    });

    it('should not add missed extensions for other resources', function () {
        var r = new Resource('http://1.gravatar.com/avatar/4d63e4a045c7ff22accc33dc08442f86?s=140&amp;d=%2Fwp-content%2Fuploads%2F2015%2F05%2FGood-JOb-150x150.jpg&amp;r=g', '');
        r.getType = sinon.stub().returns('home');
        var filename = byTypeFilenameGenerator(r, s.options, s.occupiedFileNames);
        filename.should.equalFileSystemPath('4d63e4a045c7ff22accc33dc08442f86');
    });

    it('should return filename with correct subdirectory', function() {
        s.options.subdirectories = [
            { directory: 'img', extensions: ['.jpg', '.png', '.svg'] }
        ];

        var r = new Resource('http://example.com/a.png');
        var filename = byTypeFilenameGenerator(r, s.options, s.occupiedFileNames);
        filename.should.equalFileSystemPath('img/a.png');
    });

    it('should return different filename if desired filename is occupied', function() {
        var r1 = new Resource('http://first-example.com/a.png');
        var r2 = new Resource('http://second-example.com/a.png');

        var f1 = byTypeFilenameGenerator(r1, s.options, s.occupiedFileNames);
        f1.should.equalFileSystemPath('a.png');
        r1.setFilename(f1);
        s.addOccupiedFileName(r1.getFilename());

        var f2 = byTypeFilenameGenerator(r2, s.options, s.occupiedFileNames);
        f2.should.not.equalFileSystemPath('a.png');
    });

    it('should return different filename if desired filename is occupied N times', function() {
        var r1 = new Resource('http://first-example.com/a.png');
        var r2 = new Resource('http://second-example.com/a.png');
        var r3 = new Resource('http://third-example.com/a.png');
        var r4 = new Resource('http://fourth-example.com/a.png');

        var f1 = byTypeFilenameGenerator(r1, s.options, s.occupiedFileNames);
        f1.should.equalFileSystemPath('a.png');
        r1.setFilename(f1);
        s.addOccupiedFileName(r1.getFilename());

        var f2 = byTypeFilenameGenerator(r2, s.options, s.occupiedFileNames);
        f2.should.not.equalFileSystemPath(r1.getFilename());
        r2.setFilename(f2);
        s.addOccupiedFileName(r2.getFilename());

        var f3 = byTypeFilenameGenerator(r3, s.options, s.occupiedFileNames);
        f3.should.not.equalFileSystemPath(r1.getFilename());
        f3.should.not.equalFileSystemPath(r2.getFilename());
        r3.setFilename(f3);
        s.addOccupiedFileName(r3.getFilename());

        var f4 = byTypeFilenameGenerator(r4, s.options, s.occupiedFileNames);
        f4.should.not.equalFileSystemPath(r1.getFilename());
        f4.should.not.equalFileSystemPath(r2.getFilename());
        f4.should.not.equalFileSystemPath(r3.getFilename());
    });
});