var Scraper = require('./lib/scraper.js');

module.exports = function scrape (options, callback) {
	return new Scraper(options).scrape(callback);
};
