var Scraper = require('./lib/scraper.js');

module.exports.scrape = function (options, callback) {
  return new Scraper(options).scrape(callback);
};