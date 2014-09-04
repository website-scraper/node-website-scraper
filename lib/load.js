var Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs-extra')),
  request = Promise.promisifyAll(require('request')),
  path = require('path'),
  cheerio = require('cheerio'),
  _ = require('underscore'),
  Utils = require('./utils.js');

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
    var occupiedFilenames = getAllLoadedFilenames(),
      filename = utils.trimFilename(filename),
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
          return loadCssImages(response[1], absoluteUrl, localFilePath)
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
   * @param loadFunction {function} - promisified function with 2 parameters: urlToLoad and localPathToSave
   * @param baseLocalFilename {string} - return relative path from baseLocalFilename to localFilename
   * @returns {{promise: Promise, localPath: (string|undefined)}}
   */
  function loadFileFromUrl(url, loadFunction, baseLocalFilename){
    var basename = path.basename(url),
      localFilename = getLoadedFilename(url), // Get filename for url if url has already loaded
      promise = null;

    // If file was not loaded
    if (!localFilename) {
      localFilename = getFilename(baseFullPath, basename);
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
   * @param $ {function} - cheerio function
   * @param selector {string} - selector, examples: "img" for images, ".myClass" elements with class = myClass
   * @param attribute {string} - examples: "src" for "img" selector, "href" for "link" selector
   * @param srcLoadFunction {function} - function for loading this type of resource
   * @param promises - array of promises
   * @returns {Promise} - promise for all sources
   */
  function loadSourcesBySelector($, selector, attribute, srcLoadFunction, promises) {
    var srcPromises = promises;

    $(selector).each(function () {
      // Get attribute value
      var src = $(this).attr(attribute);
      if (!src) return false;

      // Compute absolute path for source
      var srcAbsolutePath = utils.getAbsolutePath(url, src);
      // Load source with srcLoadFunction
      var result = loadFileFromUrl(srcAbsolutePath, srcLoadFunction);

      // If result contains promise (file was not loaded, need to load it)
      if(result.promise)
        srcPromises.push(result.promise);
      // If result contains localPath for url (it should always contain localPath!)
      if(result.localPath)
        $(this).attr(attribute, result.localPath);
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
  var loadCssImages = Promise.method(function (text, cssRemotePath, cssLocalPath) {
    var cssLocalDirname = cssLocalPath ? path.dirname(cssLocalPath) : baseFullPath,
      commentRegexp = /\/\*([\s\S]*?)\*\//g,
      urlRegexp = /url\(['"]*(.+?)['"]*\)/gi,
      urlMatch,
      urlPromises = [];

    // Remove all comments
    text = text.replace(commentRegexp, '');

    // For each 'url()'
    while (urlMatch = urlRegexp.exec(text)) {
      var urlPath = urlMatch[1];

      // skip base64 encoded image
      if (utils.isEmbeddedImage(urlPath))
        continue;

      var urlAbsolutePath = utils.getAbsolutePath(cssRemotePath, urlPath);
      var result = loadFileFromUrl(urlAbsolutePath, loadBinaryFileFromUrl, cssLocalDirname);

      if(result.promise)
        urlPromises.push(result.promise);
      if(result.localPath)
        text = text.replace(urlPath, result.localPath);
    }
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
      }).then(function (response) {
        return utils.toUtf8(response[1])
      })
    }),

    /**
     * Load sources specified by selector and attr in html
     * @param {string} html - Text of html file
     * @param {string} selector - Selector
     * @param {string} attr - Attribute
     * @return {Promise}
     * Example: to get all images in html use selector = 'img' attr = 'src'
     */
    loadSources: Promise.method(function (html, selector, attr) {
      var $ = cheerio.load(html);
      return loadSourcesBySelector($, selector, attr, loadBinaryFileFromUrl, []);
    }),

    /**
     * Load css files
     * @param {string} html - Text of html file
     * @return {Promise}
     */
    loadCss: Promise.method(function (html) {
      var $ = cheerio.load(html),
        indexText = $.html(),
        cssPromises = [],
        selector = 'link[rel="stylesheet"]',
        attr = 'href';

      // Load css images in index file
      cssPromises
        .push(loadCssImages(indexText, url)
        .then(function (response) {
          $ = cheerio.load(response)
        }));

      // Load css files
      return loadSourcesBySelector($, selector, attr, loadCssFileFromUrl, cssPromises);
    })
  }
};

module.exports = Loader;