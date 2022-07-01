import 'should';
import scrape from 'website-scraper';
import _ from 'lodash';
import fs from 'fs/promises';

const urls = JSON.parse(await fs.readFile(new URL('./urls.json', import.meta.url)));
const options = JSON.parse(await fs.readFile(new URL('./options.json', import.meta.url)));

const resultDirname = './test/e2e/results';

describe('E2E', function() {
	before(async () => {
		await fs.rm(resultDirname, { recursive: true, force: true });
		await fs.mkdir(resultDirname, { recursive: true });
	});

	after(() => {
		console.log('Scraping completed. Go to ' + resultDirname + ' to check results');
	});

	urls.forEach(function(url) {
		describe(url, function() {
			it('should be successfully scraped with byType filename generator', function() {
				const scraperOptions = _.clone(options);
				const hostname = new URL(url).hostname;
				scraperOptions.directory = resultDirname + '/' + hostname + '-byType';
				scraperOptions.urls = [ { url: url, filename: 'index.html' } ];
				scraperOptions.filenameGenerator = 'byType';
				return scrape(scraperOptions).then(function(result) {
					result.should.be.ok();
				});
			});

			it('should be successfully scraped with bySiteStructure filename generator', function() {
				const scraperOptions = _.clone(options);
				const hostname = new URL(url).hostname;
				scraperOptions.directory = resultDirname + '/' + hostname + '-bySiteStructure';
				scraperOptions.urls = [ { url: url } ];
				scraperOptions.filenameGenerator = 'bySiteStructure';
				return scrape(scraperOptions).then(function(result) {
					result.should.be.ok();
				});
			});
		});
	});
});
