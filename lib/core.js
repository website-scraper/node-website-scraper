var Promise = require('bluebird'),
  fs = require('fs-extra'),
  path = require('path'),
  cheerio = require('cheerio'),
  validUrl = require('valid-url'),
  _ = require('underscore'),
  Load = require('./load.js'),
  config = require('./defaults.js');

var ScraperCore = function(data){
  var options = {},
    load,
    $;

  options.url = data.url;
  options.path = data.path;
  options.indexFile = data.indexFile || config.indexFile;
  options.srcToLoad = data.srcToLoad || config.srcToLoad;
  options.staticDirectories = data.hasOwnProperty('staticDirectories')
    ? data.staticDirectories
    : config.staticDirectories;

  var prepare = Promise.method(function(html){
    $ = cheerio.load(html);

    $('base').each(function(){
      options.url = $(this).attr('href');
      console.log('Found <base>. Url changed to ' + options.url);
      $(this).remove();
    });

  });

  var loadHtmlSources = Promise.method(function(){
    var indexFileFullPath = path.resolve(options.path, options.indexFile),
      p = load.loadCss($.html());

    _.each(options.srcToLoad, function(src) {
      p = p.then(function(newHtml){return load.loadSources(newHtml, src.selector, src.attributeName)});
    });

    p = p.then(function(newHtml){ return load.saveIndexHtml(indexFileFullPath, newHtml)})
      .then(function(){return {status: 'success'}});

    return p;
  });

  var process = Promise.method(function(){
    load = new Load(options.url, options.path, options.staticDirectories);

    return load.loadIndexHtml()
      .then(prepare)
      .then(loadHtmlSources);
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
