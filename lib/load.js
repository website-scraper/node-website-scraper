var Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs-extra')),
  request = Promise.promisifyAll(require('request')),
  path = require('path'),
  url = require('url'),
  cheerio = require('cheerio'),
  _ = require('underscore'),
  utils = require('./utils.js'),
  Logger = require('./log.js'),
  defaults = require('./defaults.js');

/** @constructor */
var Loader = function (data) {
  var options = _.clone(defaults),
    encoding = 'binary',
    loadedFiles = {},
    logger;

  options = _.extend(options, data);

  function makeRequest(url) {
    return request.getAsync({
      url: url,
      method: 'GET',
      encoding: encoding,
      strictSSL: false
    })
      .then(function (response) {
        return response[1]
      });
  }

  function beforeDownload() {
    fs.ensureDirSync(options.directory);

    // Set absolute path for directory
    options.directory = path.resolve(process.cwd(), options.directory || '');

    // Create map { url -> local filename } for downloading
    options.urlsToLoad = (function() {
      if(!_.isEmpty(options.paths)) {
        return _.map(options.paths, function (path) {
          return {
            filename: path.filename,
            url: url.resolve(path.url || options.url, path.path)
          };
        })
      } else {
        return [{
          filename: options.indexFile,
          url: options.url
        }]
      }
    })();

    // Set static subdirectories as loaded to avoid saving file with subdirectory name
    _.map(options.subdirectories, function (dir) {
      setLoadedFilename(dir.directory, path.resolve(options.directory, dir.directory));
    });

    logger = new Logger(options.log);
  }

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
   * @returns {Array}
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

    while (occupiedFilenames.indexOf(fullPath) >= 0) {
      fullPath = path.join(dirname, staticDir, basename + '_' + ++index + ext);
    }
    return fullPath;
  }

  /**
   * Returns directory for specified extension
   * @param ext - file extension (example: .png, .css)
   * @returns {string}
   */
  function getDirectoryByExtension(ext) {
    var dirObj = _.chain(options.subdirectories)
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
   * @param options {Object} current html options, contain fields: url, filename
   * @returns {string} modified html
   */
  function beforeDownloadHtml(html, options) {
    var $ = cheerio.load(html);
    $('base').each(function () {
      var self = $(this);
      var href = self.attr('href');
      options.url = utils.getAbsolutePath(options.url, href);
      logger.log('Found <base>. Url changed to ' + options.url);
      self.remove();
    });
    return $.html();
  }

  /**
   * Makes request to remote binary file and saves it locally
   * @param {string} binaryUrl - absolute url of binary
   * @param {string} filePath - local path to save file
   * @return {Promise}
   */
  function loadBinaryFileFromUrl(binaryUrl, filePath) {
    return makeRequest(binaryUrl)
      .then(function (response) {
        return fs.outputFileAsync(filePath, response, {encoding: encoding})
      })
      .then(function () {
        logger.log(binaryUrl + ' -> ' + filePath);
      })
  }

  /**
   * Load remote css files, searches images in url() and loads them
   * @param {string} absoluteUrl - css absolute url
   * @param {string} localFilePath - local path to save file
   * @return {Promise}
   */
  function loadCssFileFromUrl(absoluteUrl, localFilePath) {
    return makeRequest(absoluteUrl)
      .then(function (response) {
        return loadCssSources(response, absoluteUrl, localFilePath)
      })
      .then(function (response) {
        return fs.outputFileAsync(localFilePath, response, {encoding: encoding})
      })
      .then(function () {
        logger.log(absoluteUrl + ' -> ' + localFilePath);
      })
  }

  /**
   * Perform all preparations for loading from url
   * Calculate localFilename for url, call loadFunction if localFilename was not loaded
   * @param url {string} - url to load
   * @param baseLocalFilename {string} - return relative path from baseLocalFilename to localFilename
   * @returns {{promise: Promise, localPath: (string|undefined)}}
   */
  function loadFileFromUrl(url, baseLocalFilename) {
    var basename = path.basename(url),
      localFilename = getLoadedFilename(url), // Get filename for url if url has already been loaded
      loadFunction = null,
      promise = null,
      ext;

    // If file was not loaded
    if (!localFilename) {
      localFilename = getFilename(options.directory, basename);
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
    var relativeFilename = utils.pathToUnixFormat(path.relative(baseLocalFilename || options.directory, localFilename));

    return {
      promise: promise,
      localPath: relativeFilename
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
        logger.log('sources were loaded: selector = ' + selector + ', attr = ' + attribute + ' (' + srcPromises.length + ')');
        return $.html();
      });
  }

  /**
   * Load images from paths which are set in 'url()' in files
   * @param {string} text - Text of css file
   * @param {string} cssRemotePath - Absolute path  of  file (for resolving sources' paths)
   * @param {string} cssLocalPath - Local full path of css file
   * @return {Promise}
   */
  function loadCssSources(text, cssRemotePath, cssLocalPath) {
    var cssLocalDirname = cssLocalPath ? path.dirname(cssLocalPath) : options.directory,
      commentRegexp = /\/\*([\s\S]*?)\*\//g,
      sourcesRegexps = [
        /(@import[\s]*['"]?[\s]*)(.+?)([\s]*['"]?;)/gi,
        /((?:@import[\s]*)?url[\s]*\([\s'"]*)(.+?)([\s'"]*\))/gi
      ],
      urlPromises = [];

    // Remove all comments
    text = text.replace(commentRegexp, '');

    _.each(sourcesRegexps, function (regexp) {
      var textOrigin = text,
        urlMatch,
        url;

      while (urlMatch = regexp.exec(textOrigin)) {
        url = urlMatch[2];

        if (url && !utils.isEmbeddedSource(url)) {
          var urlAbsolutePath = utils.getAbsolutePath(cssRemotePath, url);
          var result = loadFileFromUrl(urlAbsolutePath, cssLocalDirname);

          if (result.promise)
            urlPromises.push(result.promise);
          if (result.localPath) {
            text = text.replace(urlMatch[0], urlMatch[1] + result.localPath + urlMatch[3]);
          }
        }
      }
    });

    // Create promise for all images
    return Promise.all(urlPromises)
      .then(function () {
        logger.log('css images were loaded for ' + cssLocalPath + ' (' + urlPromises.length + ')');
        return text;
      })
  }

  function loadHtml(options) {
    return makeRequest(options.url)
      .then(function (html) {
        setLoadedFilename(options.url, options.filename);
        return beforeDownloadHtml(html, options);
      });
  }

  function start() {
    beforeDownload();
    var p = Promise.resolve();

    // Load each path
	  _.each(options.urlsToLoad, function(currentOptions) {

      // Load html
      p = p.then(function () { return loadHtml(currentOptions) });

      // Load css
      p = p.then(function (html) { return loadCssSources(html, currentOptions.url) });

      // Load all sources
      _.each(options.srcToLoad, function (src) {
        p = p.then(function (newHtml) {
          return loadSources(newHtml, src.selector, src.attr)
        });
      });

      // Save html to file
      var absoluteFilename = path.resolve(options.directory, currentOptions.filename);
      p = p.then(function (html) {
        fs.outputFileSync(absoluteFilename, html, { encoding: encoding });
        logger.log(currentOptions.url + ' -> ' + absoluteFilename);
        return { html: html }
      });
	  });

    return p;
  }

  function errorCleanup() {
    return fs.removeAsync(options.directory);
  }

  function noop() {}

  return {
    scrape: function (callback) {
      callback = typeof callback === 'function' ? callback : noop;

      if (fs.existsSync(options.directory)) {
        return callback(new Error('Path ' + options.directory + ' exists'), null);
      }

      start()
        .then(function (res) {
          return callback(null, res);
        })
        .catch(function (e) {
          errorCleanup();
          return callback(e, null);
        });
    }
  }
};

module.exports = Loader;
