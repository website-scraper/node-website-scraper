import Scraper from './lib/scraper.js';
import { BlockPrivateAddressesPlugin } from './lib/plugins/index.js';

export { BlockPrivateAddressesPlugin };

export default (options) => {
	return new Scraper(options).scrape();
};
