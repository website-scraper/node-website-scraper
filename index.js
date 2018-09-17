const Promise = require('bluebird');
const Scraper = require('./lib/scraper.js');

module.exports = (options, callback) => {
	return Promise.try(() => {
		return new Scraper(options).scrape(callback);
	});
};

module.exports.defaults = Scraper.defaults;
