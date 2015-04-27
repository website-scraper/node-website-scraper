var nock = require('nock');
var _ = require('underscore');
var Loader = require('../lib/load');
var fs = require('fs-extra');

var defaultOptions = {
  urls: ['http://example.com']
};

function getTmpDirectoryName() {
    return _.uniqueId(__dirname + '/tmpDir_' + new Date().getTime().toString() + '_');
}

var should = require('should')
describe('Load', function(){
  describe('#getLoadedFilename', function(){
    it('should return nothing if no filename was set for url before', function(){
      var loader = new Loader(defaultOptions);
      var url = 'http://example.com';

      var localFilename = loader.getLoadedFilename(url);
      should(localFilename).not.be.ok;
    });
  });

  describe('#setLoadedFilename, #getLoadedFilename', function(){
    it('should set local filename for url and then get local filename by url', function(){
      var loader = new Loader(defaultOptions);
      var url = 'http://example.com';
      var localFilename = 'index.html';

      loader.setLoadedFilename(url, localFilename);
      loader.getLoadedFilename(url).should.be.equal(localFilename);
    });
  });

  describe('#getAllLoadedFilenames', function(){
    it('should return an array with all local filenames set before', function(){
      var loader = new Loader(defaultOptions);

      for (var i = 1; i <= 3; i++) {
        loader.setLoadedFilename('http://example.com/' + i, 'file-' + i + '.txt');
      }

      var allLoadedFilenames = loader.getAllLoadedFilenames();
      allLoadedFilenames.should.be.instanceof(Array).and.have.lengthOf(3);
      allLoadedFilenames.should.containEql('file-1.txt');
      allLoadedFilenames.should.containEql('file-2.txt');
      allLoadedFilenames.should.containEql('file-3.txt');
    });
  });

  describe('#getFilename', function(){
    it('should return different result for filename if such file was already loaded', function(){
      var loader = new Loader(defaultOptions);

      var url1 = 'http://example.com/index.html'
      var filename1 = 'index.html';
      var localFilename1 = loader.getFilename(filename1);
      loader.setLoadedFilename(url1, localFilename1);

      var url2 = 'http://example.com/blog/index.html'
      var filename2 = 'index.html';
      var localFilename2 = loader.getFilename(filename2);
      loader.setLoadedFilename(url2, localFilename2);

      var url3 = 'http://example.com/about/index.html'
      var filename3 = 'index.html';
      var localFilename3 = loader.getFilename(filename3);
      loader.setLoadedFilename(url3, localFilename3);

      localFilename1.should.not.be.equal(localFilename2);
      localFilename2.should.not.be.equal(localFilename3);
      localFilename3.should.not.be.equal(localFilename1);
    });
  });

  describe('#getDirectoryByExtension', function(){
    it('should return directory for extension specified in options', function(){
      var loader = new Loader(_.extend({}, defaultOptions, {
        subdirectories: [
          {
            directory: 'images',
            extensions: ['.png', '.jpg']
          },
          {
            directory: 'scripts',
            extensions: ['.js']
          },
          {
            directory: 'styles',
            extensions: ['.css']
          }
        ]
      }));

      loader.getDirectoryByExtension('.png').should.be.equal('images');
      loader.getDirectoryByExtension('.jpg').should.be.equal('images');
      loader.getDirectoryByExtension('.js').should.be.equal('scripts');
      loader.getDirectoryByExtension('.css').should.be.equal('styles');

    });

    it('should return nothing if no directory for extension was set', function(){
      var loader = new Loader(_.extend({}, defaultOptions, {
        subdirectories: null
      }));

      loader.getDirectoryByExtension('.svg').should.be.empty;
      loader.getDirectoryByExtension('.png').should.be.empty;

    });
  });

  describe('#validate', function(){
    it('should return rejected promise if directory exists', function(){
      var directory = getTmpDirectoryName();

      fs.mkdir(directory, function(){
        var loader = new Loader(_.extend({}, defaultOptions, {
          directory: directory
        }));

        loader.validate().then(_.noop).catch(function(e) {
            e.should.be.instanceof(Error);
        }).finally(function() {
            fs.remove(directory);
        });
      });
    });

    it('should return rejected promise if no directory passed', function(){
      var loader = new Loader();

      loader.validate().then(_.noop).catch(function(e) {
          e.should.be.instanceof(Error);
      });
    });

    it('should return resolved promise if directory doesn\'t exist', function(){
      var directory = getTmpDirectoryName();

      var loader = new Loader(_.extend({}, defaultOptions, {
        directory: directory
      }));

      loader.validate().then(function(result) {
          should(result).be.empty;
      });
    });
  });

});
