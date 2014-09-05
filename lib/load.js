var Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs-extra')),
  request = Promise.promisifyAll(require('request')),
  path = require('path'),
  cheerio = require('cheerio'),
  _ = require('underscore'),
  Utils = require('./utils.js');

var encoding = 'binary';

/** @constructor */
var Loader = function (baseUrl, baseDir, staticDirs) {
  var utils = new Utils(),
    url = baseUrl,
    baseFullPath = baseDir,
    staticFullPaths = _.map(staticDirs, function(dir) {return path.resolve(baseFullPath, dir.directory)}),
    loadedFiles = {};

  /**
   * Returns local absolute filename associated with url
   * @param url - remote url
   * @returns {string|undefined}
   */
  function getLoadedFilename(url) {
    return loadedFiles[url];
  }

  /**
   * Set local absolute filename associated with url
   * @param url - remote url
   * @param local - local absolute path
   */
  function setLoadedFilename(url, local) {
    loadedFiles[url] = local;
  }

  /**
   * Return all local occupied filenames
   * @returns {array}
   */
  function getAllLoadedFilenames() {
    return _.values(loadedFiles);
  }

  /**
   * Returns free filename for file or null if file was already loaded
   * example: for 'index.css' it return 'index_1.css' if 'index.css' already exists
   * @return {string}
   */
  function getFilename(dirname, filename) {
    filename = utils.trimFilename(filename);
    var occupiedFilenames = getAllLoadedFilenames(),
      ext = path.extname(filename),
      staticDir = getDirectoryByExtension(ext),
      fullPath = path.join(dirname, staticDir, filename),

      basename = path.basename(filename, ext),
      index = 0;

    // If file was already loaded or fullPath is equals to some of static directories
    while (occupiedFilenames.indexOf(fullPath) >= 0 || staticFullPaths.indexOf(fullPath) >= 0) {
      fullPath = path.join(dirname, staticDir, basename + '_' + ++index + ext);
      //console.log('Occupied filename ' + fullPath + '. Trying to generate new.');
    }
    return fullPath;
  }

  /**
   * Returns directory for specified extension
   * @param ext - file extension (example: .png, .css)
   * @returns {string}
   */
  function getDirectoryByExtension(ext) {
    var dirObj = _.chain(staticDirs)
      .filter(function (dir) {
        return _.indexOf(dir.extensions, ext) >= 0
      })
      .first()
      .value();
    return (!dirObj) ? '' : dirObj.directory;
  }

  /**
   * Search for <base> tag
   * Change url if <base> found and remove tag from html
   * @param html {string} html to search
   * @returns {string} modified html
   */
  function prepare(html) {
    var $ = cheerio.load(html);
    $('base').each(function(){
      url = $(this).attr('href');
      console.log('Found <base>. Url changed to ' + url);
      $(this).remove();
    });
    return $.html();
  }

  /**
   * Makes request to remote binary file and saves it locally
   * @param {string} binaryUrl - absolute url of binary
   * @param {string} filePath - local path to save file
   * @return {Promise}
   */
  var loadBinaryFileFromUrl = Promise.method(function (binaryUrl, filePath) {
    return request.getAsync({
      url: binaryUrl,
      encoding: 'binary'
    }).then(function (response) {
      return fs.outputFileAsync(filePath, response[1], 'binary')
    }).then(function(){
      console.log(binaryUrl + ' -> ' + filePath);
    })
  });

  /**
   * Load remote css files, searches images in url() and loads them
   * @param {string} absoluteUrl - css absolute url
   * @param {string} relativeCssPath - relative path from index.html to css-file
   * @param {string} localFilePath - local path to save file
   * @return {Promise}
   */
  var loadCssFileFromUrl = Promise.method(
    function (absoluteUrl, localFilePath) {
      return request.getAsync(absoluteUrl)
        .then(function (response) {
          return loadCssSources(response[1], absoluteUrl, localFilePath)
        })
        .then(function (response) {
          return fs.outputFileAsync(localFilePath, response)
        }).then(function(){
          console.log(absoluteUrl + ' -> ' + localFilePath);
        })
    });

  /**
   * Perform all preparations for loading from url
   * Calculate localFilename for url, call loadFunction if localFilename was not loaded
   * @param url {string} - url to load
   * @param baseLocalFilename {string} - return relative path from baseLocalFilename to localFilename
   * @returns {{promise: Promise, localPath: (string|undefined)}}
   */
  function loadFileFromUrl(url, baseLocalFilename){
    var basename = path.basename(url),
      localFilename = getLoadedFilename(url), // Get filename for url if url has already loaded
      loadFunction = null,
      promise = null,
      ext;

    // If file was not loaded
    if (!localFilename) {
      localFilename = getFilename(baseFullPath, basename);
      ext = path.extname(localFilename);

      switch (ext) {
        case '.css':
          loadFunction = loadCssFileFromUrl;
          break;
        default:
          loadFunction = loadBinaryFileFromUrl;
          break;
      }

      promise = loadFunction(url, localFilename);
      setLoadedFilename(url, localFilename);
    }

    // Convert local path to unix format
    localFilename = utils.pathToUnixFormat(path.relative(baseLocalFilename || baseFullPath, localFilename));

    return {
      promise: promise,
      localPath: localFilename
    }
  }

  /**
   * Load all sources with given selector and attribute
   * @param html {string}
   * @param selector {string} - selector, examples: "img" for images, ".myClass" elements with class = myClass
   * @param attribute {string} - examples: "src" for "img" selector, "href" for "link" selector
   * @returns {Promise} - promise for all sources
   */
  function loadSources(html, selector, attribute) {
    var srcPromises = [],
      $ = cheerio.load(html);

    $(selector).each(function () {
      // Get attribute value
      var src = $(this).attr(attribute),
        srcAbsolutePath,
        srcLoadedResult;

      if (src) {
        // Compute absolute url
        srcAbsolutePath = utils.getAbsolutePath(options.url, src);
        // Load absolute url
        srcLoadedResult = loadFileFromUrl(srcAbsolutePath);

        if (srcLoadedResult.promise)
          srcPromises.push(srcLoadedResult.promise);
        if (srcLoadedResult.localPath)
          $(this).attr(attribute, srcLoadedResult.localPath);
      }
    });
    // Create promise for all sources
    return Promise.all(srcPromises)
      .then(function () {
        console.log('sources were loaded: selector = ' + selector + ', attr = ' + attribute + ' (' + srcPromises.length + ')');
        return $.html();
      });
  }

  /**
   * Load images from paths which are set in 'url()' in files
   * @param {string} text - Text of css file
   * @param {string} curPath - Absolute path  of  file (for resolving sources' paths)
   * @return {Promise}
   */
  var loadCssSources = Promise.method(function (text, cssRemotePath, cssLocalPath) {
    var cssLocalDirname = cssLocalPath ? path.dirname(cssLocalPath) : baseFullPath,
      commentRegexp = /\/\*([\s\S]*?)\*\//g,
      urlRegexp = /(@import[\s]*){0,1}url[\s]*\([\s'"]*(.+?)[\s'"]*\)/gi,
      importRegexp = /@import[\s]*['"]{0,1}[\s]*(.+?)[\s]*['"]{0,1};/gi,
      urlMatch,
      urlPromises = [],
      urlsToLoad = [];

    // Remove all comments
    text = text.replace(commentRegexp, '');

    // Foreach 'url() or @import url()'
    while (urlMatch = urlRegexp.exec(text))
      urlsToLoad.push(urlMatch[2]);
    // Foreach @import
    while (urlMatch = importRegexp.exec(text))
      urlsToLoad.push(urlMatch[1]);

    _.each(urlsToLoad, function (url) {
      // skip base64 encoded image and empty url
      if (url && !utils.isEmbeddedImage(url)) {
        var urlAbsolutePath = utils.getAbsolutePath(cssRemotePath, url);
        var result = loadFileFromUrl(urlAbsolutePath, cssLocalDirname);

        if (result.promise)
          urlPromises.push(result.promise);
        if (result.localPath)
          text = text.replace(url, result.localPath);
      }
    });

    // Create promise for all images
    return Promise.all(urlPromises)
      .then(function () {
        console.log('css images were loaded for ' + cssLocalPath + ' (' + urlPromises.length + ')');
        return text;
      })
  });

  return {
    /**
     * Load main html
     * @return {string}
     */
    loadIndexHtml: Promise.method(function () {
      return request.getAsync({
        url: url,
        method: 'GET',
        encoding: null
      }).then(function (response) { // Get index page
        var buffer = response[1];
        return buffer.toString(encoding)
      }).then(function (html) {
        return prepare(html)
      }).then(function (html) {   // Load css sources in index page
        return loadCssSources(html, url);
      })
    }),

    saveIndexHtml: Promise.method(function(filename, html) {
      return fs.outputFileAsync(filename, html, {encoding: encoding})
    }),

    /**
     * Load sources specified by selector and attr in html
     * @param {string} html - Text of html file
     * @param {string} selector - Selector
     * @param {string} attr - Attribute
     * @return {Promise}
     * Example: to get all images in html use selector = 'img' attr = 'src'
     */
    loadSources: loadSourcesBySelector
  }
};

module.exports = Loader;