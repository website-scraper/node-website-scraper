import Scraper from './lib/scraper.js';

export default (options) => {
	return new Scraper(options).scrape();
};
