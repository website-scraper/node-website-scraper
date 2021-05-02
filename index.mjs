import Promise from 'bluebird';
import Scraper from './lib/scraper.js';

export default (options) => {
	return Promise.try(() => {
		return new Scraper(options).scrape();
	});
}
// module.exports = (options, callback) => {
// 	return Promise.try(() => {
// 		return new Scraper(options).scrape(callback);
// 	});
// };

// module.exports.defaults = Scraper.defaults;
