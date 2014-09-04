var Promise = require('bluebird'),
  fs = require('fs-extra'),
  path = require('path'),
  cheerio = require('cheerio'),
  validUrl = require('valid-url'),
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

    // html5
    $('meta[charset]').filter(function(){
      var charset = $(this).attr('charset').toLowerCase();
      if(charset.indexOf('utf-8') < 0){
        $(this).attr('charset', 'utf-8');
        console.log('Found ' + charset + ' in <meta> and replace charset to utf-8');
      }
    });

    // other html
    $('meta[content*=charset]').filter(function(){
      var content = $(this).attr('content').toLowerCase();
      if(content.indexOf('utf-8') < 0){
        $(this).attr('content', 'text/html; charset=utf-8');
        console.log('Found ' + content + ' in <meta> and replace charset to utf-8');
      }
    });
  });

  var loadHtmlSources = Promise.method(function(srcArray){
    var p = load.loadCss($.html()),
      currentSrc;

    while(currentSrc = srcArray.pop()) {
      (function(src) {
        p = p.then(function(newHtml){return load.loadSources(newHtml, src.selector, src.attributeName)});
      }) (currentSrc);
    }

    p = p.then(function(newHtml){$ = cheerio.load(newHtml)});
    return p;
  });

  var process = Promise.method(function(){
    var indexFileFullPath = path.resolve(options.path, options.indexFile);
    load = new Load(options.url, options.path, options.staticDirectories);

    return load.loadIndexHtml()
      .then(prepare)
      .then(function(){return loadHtmlSources(options.srcToLoad)})
      .then(function(){return fs.outputFileAsync(indexFileFullPath, $.html())})
      .then(function(){return {status: 'success'}});
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
