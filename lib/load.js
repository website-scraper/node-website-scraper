var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');
var cheerio = require('cheerio');
var getCssUrls = require('css-url-parser');
var _ = require('underscore');
var utils = require('./utils/utils.js');
var request = require('./utils/request');
var Logger = require('./log.js');
var defaults = require('./config/defaults.js');

var Loader = function (data) {
  var options,
    loadedFiles = {},
    logger,
    makeRequest;

  options = _.extend({}, defaults, data);

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
    var occupiedFilenames = getAllLoadedFilenames();
    var ext = path.extname(filename);
    var staticDir = getDirectoryByExtension(ext);
    var fullPath = path.join(options.directory, staticDir, filename);
    var basename = path.basename(filename, ext);
    var index = 1;

    while (_.contains(occupiedFilenames, fullPath)) {
      fullPath = path.join(options.directory, staticDir, basename + '_' + index + ext);
      index++;
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

  function getFileProcessingFunction(options) {
    var ext = path.extname(options.filename);
    var processingFunction;

    switch (ext) {
      case '.css':
        processingFunction = loadCssSources.bind(null, options.url, options.filename);
        break;
      case '.html':
        processingFunction = loadHtml.bind(null, options.url, options.filename);
        break;
      default:
        processingFunction = function () {
          return arguments[0];
        };
        break;
    }
    return processingFunction;
  }

  function loadFromUrl(options) {
    var localFilename = getLoadedFilename(options.url);
    var fileProcessingFunction;

    if (!localFilename) {
      options.filename = getFilename(options.filename || path.basename(options.url));
      setLoadedFilename(options.url, options.filename);

      // Request -> processing -> save to fs
      return makeRequest(options.url).then(function requestCompleted(data) {
        options.url = data.url; // Url may be changed in redirects
        fileProcessingFunction = getFileProcessingFunction(options);
        return fileProcessingFunction(data.body);
      }).then(function saveFileToFS(text) {
        return fs.outputFileAsync(options.filename, text, {encoding: 'binary'});
      }).then(function fileSavedToFS() {
        logger.log(options.url + ' -> ' + options.filename);
        return options.filename;
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

    var p = beforeHtmlProcessing(html, currentOptions).then(function loadCssFromHtmlCode(html) {
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

    return Promise.resolve($.html());
  }

  function loadHtmlSources(htmlUrl, htmlLocalPath, htmlText, selector, attribute) {
    var htmlDirectoryPath = path.dirname(htmlLocalPath);
    var $ = cheerio.load(htmlText);
    var htmlSourcesPromises = $(selector).map(function loadHtmlSourcesForSelector() {
      var self = $(this);
      var attr = self.attr(attribute);

      if (attr) {
        var loadOptions = {
          url: utils.getUrl(htmlUrl, attr)
        };
        return loadFromUrl(loadOptions).then(function loadedHtmlSourceFileFromUrl(htmlSourceLocalPath) {
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
    var cssSourcesPromises = _.map(getCssUrls(text), function loadCssSourceFile(cssSourcePath) {
      var loadOptions = {
        url: utils.getUrl(cssUrl, cssSourcePath)
      };

      return loadFromUrl(loadOptions).then(function loadedCssSourceFileFromUrl(cssSourceLocalPath) {
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

    // Create makeRequest function with custom request params
    makeRequest = request.makeRequest.bind(null, options.request);

    // Create map { url -> local filename } for downloading
    return Promise.resolve(adaptLoadOptions(options.urls));
  }

  function load(loadOptions) {
    return Promise.reduce(loadOptions, function (result, currentOptions) {
      return loadFromUrl(currentOptions).then(function htmlLoaded(filename) {
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
