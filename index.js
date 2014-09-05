var Scraper = require('./lib/load.js');

module.exports.scrape = function (data, callback) {
  return new Scraper(data).scrape(callback);
};