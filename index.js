var Scraper = require('./lib/scraper.js');

module.exports = function (options, callback) {
  return new Scraper(options).scrape(callback);
};
