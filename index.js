var Scraper = require('./lib/load.js');

module.exports.scrape = function (options, callback) {
  return new Scraper(options).scrape(callback);
};