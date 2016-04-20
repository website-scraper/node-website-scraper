/*
describe('#getOccupiedFilenames', function() {
    it('should return empty array if nothing loaded and no subdirectories', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var occupied = s.getOccupiedFilenames();
            occupied.should.be.instanceOf(Array);
            occupied.should.be.empty();
            done();
        }).catch(done);
    });

    it('should contain all filenames for loaded resources', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var a = new Resource('http://first-resource.com', 'first.html');
            var b = new Resource('http://second-resource.com', 'second.html');
            var c = new Resource('http://third-resource.com', 'third.html');
            s.addLoadedResource(a);
            s.addLoadedResource(b);
            s.addLoadedResource(c);

            var occupied = s.getOccupiedFilenames();
            occupied.should.be.instanceOf(Array);
            occupied.should.containEql('first.html');
            occupied.should.containEql('second.html');
            occupied.should.containEql('third.html');
            done();
        }).catch(done);
    });

    it('should contain all subdirectories names', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: [
                { directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
                { directory: 'js', extensions: ['.js'] },
                { directory: 'css', extensions: ['.css'] }
            ]
        });

        s.prepare().then(function() {
            var occupied = s.getOccupiedFilenames();
            occupied.should.be.instanceOf(Array);
            occupied.should.containEql('img');
            occupied.should.containEql('js');
            occupied.should.containEql('css');
            done();
        }).catch(done);
    });
});

describe('#getDirectoryByExtension', function() {
    it('should return correct subdirectory', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: [
                { directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
                { directory: 'js', extensions: ['.js'] }
            ]
        });

        s.prepare().then(function() {
            s.getDirectoryByExtension('.jpg').should.be.eql('img');
            s.getDirectoryByExtension('.png').should.be.eql('img');
            s.getDirectoryByExtension('.svg').should.be.eql('img');
            s.getDirectoryByExtension('.js').should.be.eql('js');
            done();
        }).catch(done);
    });

    it('should return empty string if no subdirectory was found', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: [
                { directory: 'img', extensions: ['.jpg', '.png', '.svg'] },
                { directory: 'js', extensions: ['.js'] }
            ]
        });

        s.prepare().then(function() {
            s.getDirectoryByExtension('.gif').should.be.eql('');
            s.getDirectoryByExtension('.html').should.be.eql('');
            s.getDirectoryByExtension('.css').should.be.eql('');
            done();
        }).catch(done);
    });
});

describe('#generateFilename', function() {
    it('should return resource filename', function(done) {
        var s = new Scraper({
            urls: 'http://example.com',
            directory: testDirname,
            subdirectories: null
        });

        s.prepare().then(function() {
            var r = new Resource('http://example.com/a.png', 'b.png');
            var filename = s.generateFilename(r);
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
            var filename = s.generateFilename(r);
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
            var filename = s.generateFilename(r);
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

            var f1 = s.generateFilename(r1);
            f1.should.be.eql('a.png');
            r1.setFilename(f1);
            s.addLoadedResource(r1);

            var f2 = s.generateFilename(r2);
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

            var f1 = s.generateFilename(r1);
            f1.should.be.eql('a.png');
            r1.setFilename(f1);
            s.addLoadedResource(r1);

            var f2 = s.generateFilename(r2);
            f2.should.be.not.eql(r1.getFilename());
            r2.setFilename(f2);
            s.addLoadedResource(r2);

            var f3 = s.generateFilename(r3);
            f3.should.be.not.eql(r1.getFilename());
            f3.should.be.not.eql(r2.getFilename());
            r3.setFilename(f3);
            s.addLoadedResource(r3);

            var f4 = s.generateFilename(r4);
            f4.should.be.not.eql(r1.getFilename());
            f4.should.be.not.eql(r2.getFilename());
            f4.should.be.not.eql(r3.getFilename());

            done();
        }).catch(done);
    });
});
*/