require('should');
var Scraper = require('../../../lib/scraper');
var Resource = require('../../../lib/resource');
var byTypeFilenameGenerator = require('../../../lib/filename-generators/by-type');

var testDirname = __dirname + '/.scraper-test';

describe('byTypeFilenameGenerator', function() {
    it('should return resource filename', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var r = new Resource('http://example.com/a.png', 'b.png');
            var filename = byTypeFilenameGenerator(r, s.options, s.loadedResources);
            filename.should.be.eql('b.png');
            done();
        }).catch(done);
    });

    it('should return url-based filename if resource has no filename', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var r = new Resource('http://example.com/a.png', '');
			var filename = byTypeFilenameGenerator(r, s.options, s.loadedResources);
            filename.should.be.eql('a.png');
            done();
        }).catch(done);
    });

    it('should return filename with correct subdirectory', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: [
                { directory: 'img', extensions: ['.jpg', '.png', '.svg'] }
            ]
        });

        s.prepare().then(function() {
            var r = new Resource('http://example.com/a.png');
			var filename = byTypeFilenameGenerator(r, s.options, s.loadedResources);
            filename.should.be.eql('img/a.png');
            done();
        }).catch(done);
    });

    it('should return different filename if desired filename is occupied', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var r1 = new Resource('http://first-example.com/a.png');
            var r2 = new Resource('http://second-example.com/a.png');

            var f1 = byTypeFilenameGenerator(r1, s.options, s.loadedResources);
            f1.should.be.eql('a.png');
            r1.setFilename(f1);
            s.addLoadedResource(r1);

            var f2 = byTypeFilenameGenerator(r2, s.options, s.loadedResources);
            f2.should.be.not.eql('a.png');

            done();
        }).catch(done);
    });

    it('should return different filename if desired filename is occupied N times', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var r1 = new Resource('http://first-example.com/a.png');
            var r2 = new Resource('http://second-example.com/a.png');
            var r3 = new Resource('http://third-example.com/a.png');
            var r4 = new Resource('http://fourth-example.com/a.png');

			var f1 = byTypeFilenameGenerator(r1, s.options, s.loadedResources);
            f1.should.be.eql('a.png');
            r1.setFilename(f1);
            s.addLoadedResource(r1);

			var f2 = byTypeFilenameGenerator(r2, s.options, s.loadedResources);
            f2.should.be.not.eql(r1.getFilename());
            r2.setFilename(f2);
            s.addLoadedResource(r2);

			var f3 = byTypeFilenameGenerator(r3, s.options, s.loadedResources);
            f3.should.be.not.eql(r1.getFilename());
            f3.should.be.not.eql(r2.getFilename());
            r3.setFilename(f3);
            s.addLoadedResource(r3);

			var f4 = byTypeFilenameGenerator(r4, s.options, s.loadedResources);
            f4.should.be.not.eql(r1.getFilename());
            f4.should.be.not.eql(r2.getFilename());
            f4.should.be.not.eql(r3.getFilename());

            done();
        }).catch(done);
    });
});