var should = require('should');
var scraper = require('../../index');
var URL = require('url');
var fs = require('fs-extra');
var _ = require('lodash');

var urls = require('./urls.json');
var options = require('./options.json');

var resultDirname = __dirname + '/results';

describe('E2E', function() {
	before(function() {
		fs.emptyDirSync(resultDirname);
	});

	after(function() {
		console.log('Scraping completed. Go to ' + resultDirname + ' to check results');
	});

	urls.forEach(function(url) {
		describe(url, function() {
			it('should be successfully scraped', function() {
				var scraperOptions = _.clone(options);
				var hostname = URL.parse(url).hostname;
				scraperOptions.directory = resultDirname + '/' + hostname;
				scraperOptions.urls = [ { url: url, filename: 'index.html' } ];
				return scraper.scrape(scraperOptions).then(function(result) {
					result.should.be.ok();
				});
			});
		});
	});
});
