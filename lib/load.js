var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');
var cheerio = require('cheerio');
var _ = require('underscore');
var utils = require('./utils/utils.js');
var css = require('./utils/css');
var Logger = require('./log.js');
var defaults = require('./config/defaults.js');

var Loader = function (data) {
  var options,
    loadedFiles = {},
    logger;

  options = _.extend(defaults, data);

  // Set absolute path for directory
  options.directory = path.resolve(process.cwd(), options.directory || '');

  function getLoadedFilename(url) {
    return loadedFiles[url];
  }

  function setLoadedFilename(url, local) {
    loadedFiles[url] = local;
  }

  function getAllLoadedFilenames() {
    return _.values(loadedFiles);
  }

  function getFilename(filename) {
    filename = utils.trimFilename(filename);
    var occupiedFilenames = getAllLoadedFilenames(),
      ext = path.extname(filename),
      staticDir = getDirectoryByExtension(ext),
      fullPath = path.join(options.directory, staticDir, filename),
      basename = path.basename(filename, ext),
      index = 0;

    while (occupiedFilenames.indexOf(fullPath) >= 0) {
      fullPath = path.join(options.directory, staticDir, basename + '_' + ++index + ext);
    }
    return fullPath;
  }

  function getDirectoryByExtension(ext) {
    var dirObj = _.chain(options.subdirectories)
      .filter(function (dir) { return _.contains(dir.extensions, ext); })
      .first()
      .value();
    return (!dirObj) ? '' : dirObj.directory;
  }

  function getFileProcessingFunction(url, filename) {
    var ext = path.extname(filename);
    var processingFunction;

    switch (ext) {
      case '.css':
        processingFunction = loadCssSources.bind(null, url, filename);
        break;
      case '.html':
        processingFunction = loadHtml.bind(null, url, filename);
        break;
      default:
        processingFunction = function () {
          return arguments[0];
        };
        break;
    }
    return processingFunction;
  }

  function loadFromUrl(url, desiredFilename) {
    var localFilename = getLoadedFilename(url);
    var fileProcessingFunction;

    if (!localFilename) {
      // Get filename
      localFilename = getFilename(desiredFilename || path.basename(url));
      // Get processing function for file
      fileProcessingFunction = getFileProcessingFunction(url, localFilename);
      // Set file as loaded
      setLoadedFilename(url, localFilename);
      // Request -> processing -> save to fs
      return utils.makeRequest(url).then(fileProcessingFunction).then(function saveFileToFS(text) {
        return fs.outputFileAsync(localFilename, text, {encoding: 'binary'});
      }).then(function fileSavedToFS() {
        logger.log(url + ' -> ' + localFilename);
        return localFilename;
      });
    }
    return Promise.resolve(localFilename);
  }

  function loadHtml(url, localPath, html) {
    var currentOptions = {
      url: url,
      filename: localPath
    };
    var absoluteLocalPath = path.resolve(options.directory, currentOptions.filename);

    var p = beforeHtmlProcessing(html, currentOptions).then(function loadCssFromHtmlCode() {
      return loadCssSources(currentOptions.url, absoluteLocalPath, html);
    });

    _.each(options.sources, function (src) {
      p = p.then(function loadSource(html) {
        return loadHtmlSources(currentOptions.url, absoluteLocalPath, html, src.selector, src.attr);
      });
    });
    return p;
  }

  function beforeHtmlProcessing(html, currentOptions) {
    var $ = cheerio.load(html);

    // Handle <base> tag
    $('base').each(function () {
      var self = $(this);
      var href = self.attr('href');
      currentOptions.url = utils.getUrl(currentOptions.url, href);
      logger.log('Found <base>. Url changed to ' + currentOptions.url);
      self.remove();
    });

//    // Update hrefs for loaded paths
//    $('a[href]').each(function () {
//      var self = $(this);
//      var href = self.attr('href');
//      var url = utils.getUrl(currentOptions.url, href);
//      var localFileForUrl = _.findWhere(options.urlsToLoad, { url: url });
//      if (localFileForUrl) {
//        self.attr('href', localFileForUrl.filename);
//      }
//    });

    return Promise.resolve($.html());
  }

  function loadHtmlSources(htmlUrl, htmlLocalPath, htmlText, selector, attribute) {
    var htmlDirectoryPath = path.dirname(htmlLocalPath);
    var $ = cheerio.load(htmlText);
    var htmlSourcesPromises = $(selector).map(function loadHtmlSourcesForSelector() {
      var self = $(this);
      var attr = self.attr(attribute);

      if (attr) {
        var htmlSourceUrl = utils.getUrl(htmlUrl, attr);
        return loadFromUrl(htmlSourceUrl).then(function loadedHtmlSourceFileFromUrl(htmlSourceLocalPath) {
          var srcRelativePath = utils.getUnixPath(path.relative(htmlDirectoryPath, htmlSourceLocalPath));
          self.attr(attribute, srcRelativePath);
          return Promise.resolve();
        });
      }
      return Promise.reject();
    });

    return Promise.settle(htmlSourcesPromises).then(function () {
      logger.log('sources were loaded: selector = ' + selector + ', attr = ' + attribute + ' for ' + htmlLocalPath);
      return $.html();
    });
  }

  function loadCssSources(cssUrl, cssLocalPath, text) {
    var cssDirectoryPath = path.dirname(cssLocalPath);
    var cssSourcesPromises = _.map(css.getSourcesPaths(text), function loadCssSourceFile(cssSourcePath) {
      var cssSourceUrl = utils.getUrl(cssUrl, cssSourcePath);

      return loadFromUrl(cssSourceUrl).then(function loadedCssSourceFileFromUrl(cssSourceLocalPath) {
        var srcRelativePath = utils.getUnixPath(path.relative(cssDirectoryPath, cssSourceLocalPath));
        text = text.replace(new RegExp(cssSourcePath, 'g'), srcRelativePath);
        return Promise.resolve();
      });
    });

    return Promise.settle(cssSourcesPromises).then(function () {
      logger.log('css sources were loaded for ' + cssLocalPath);
      return text;
    });
  }

  function validate() {
    return new Promise(function (resolve, reject) {
      if (fs.existsSync(options.directory)) {
        return reject(new Error('Path ' + options.directory + ' exists'));
      }
      return resolve();
    });
  }

  function adaptLoadOptions (loadOptions) {
    loadOptions = _.isArray(loadOptions) ? loadOptions : [loadOptions];

    return _.reduce(loadOptions, function (memo, loadOption) {
      var url = _.isObject(loadOption) && _.has(loadOption, 'url') ? loadOption.url : loadOption.toString();
      var filename = _.isObject(loadOption) && _.has(loadOption, 'filename') ? loadOption.filename : options.defaultFilename;

      memo.push({
        url: url,
        filename: filename
      });
      return memo;
    }, []);
  }

  function beforeLoad() {
    fs.ensureDirSync(options.directory);

    // Set static subdirectories as loaded to avoid saving file with subdirectory's name
    _.map(options.subdirectories, function (dir) {
      setLoadedFilename(dir.directory, path.resolve(options.directory, dir.directory));
    });

    logger = new Logger(options.log);

    // Create map { url -> local filename } for downloading
    return Promise.resolve(adaptLoadOptions(options.urls));
  }

  function load(loadOptions) {
    return Promise.reduce(loadOptions, function (result, currentOptions) {
      return loadFromUrl(currentOptions.url, currentOptions.filename).then(function htmlLoaded(filename) {
        result.push({
          url: currentOptions.url,
          filename: filename
        });
        return result;
      });
    }, []);
  }

  function errorCleanup(error) {
    if (!_.isEmpty(getAllLoadedFilenames())) {
      fs.removeAsync(options.directory);
    }
    throw error;
  }

  return {
    getLoadedFilename: getLoadedFilename,
    setLoadedFilename: setLoadedFilename,
    getAllLoadedFilenames: getAllLoadedFilenames,
    getFilename: getFilename,
    getDirectoryByExtension: getDirectoryByExtension,
    getFileProcessingFunction: getFileProcessingFunction,
    loadFromUrl: loadFromUrl,
    loadHtml: loadHtml,
    beforeHtmlProcessing: beforeHtmlProcessing,
    loadHtmlSources: loadHtmlSources,
    loadCssSources: loadCssSources,
    validate: validate,
    beforeLoad: beforeLoad,
    load: load,
    errorCleanup: errorCleanup,

    scrape: function (callback) {
      return validate()
        .then(beforeLoad)
        .then(load)
        .catch(errorCleanup)
        .nodeify(callback);
    }
  };
};

module.exports = Loader;
