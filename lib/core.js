var Promise = require('bluebird'),
  fs = require('fs-extra'),
  path = require('path'),
  validUrl = require('valid-url'),
  _ = require('underscore'),
  Load = require('./load.js'),
  config = require('./defaults.js');

var ScraperCore = function(data){
  var options = {},
    load;

  options.url = data.url;
  options.path = data.path;
  options.indexFile = data.indexFile || config.indexFile;
  options.srcToLoad = data.srcToLoad || config.srcToLoad;
  options.staticDirectories = data.hasOwnProperty('staticDirectories')
    ? data.staticDirectories
    : config.staticDirectories;

  var process = Promise.method(function(){
    load = new Load(options.url, options.path, options.staticDirectories);

    // Load index page
    var p = load.loadIndexHtml();

    // Load all sources
    _.each(options.srcToLoad, function(src) {
      p = p.then(function(newHtml){return load.loadSources(newHtml, src.selector, src.attributeName)});
    });

    // Save index page
    p = p.then(function(newHtml){ return load.saveIndexHtml(path.resolve(options.path, options.indexFile), newHtml)})
      .then(function(){return {status: 'success'}});

    return p;
  });

  return {
    scrape: function(callback) {

      if(!options.url){
        return callback(new Error('Url is undefined!'), null);
      }
      if(!validUrl.isWebUri(options.url)){
        return callback(new Error('Url ' + options.url + ' is not correct!'), null);
      }
      if(!options.path){
        return callback(new Error('Path is undefined!'), null);
      }
      if(fs.existsSync(options.path)){
        return callback(new Error('Path ' + options.path + ' exists!'), null);
      }

      process()
        .then(function(res){return callback(null, res)})
        .catch(function(e){return callback(e, null)})
    }
  }
};

module.exports = ScraperCore;
