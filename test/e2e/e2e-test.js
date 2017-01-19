var should = require('should');
var scrape = require('../../index');
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
			it('should be successfully scraped with byType filename generator', function() {
				var scraperOptions = _.clone(options);
				var hostname = URL.parse(url).hostname;
				scraperOptions.directory = resultDirname + '/' + hostname + '-byType';
				scraperOptions.urls = [ { url: url, filename: 'index.html' } ];
				scraperOptions.filenameGenerator = 'byType';
				return scrape(scraperOptions).then(function(result) {
					result.should.be.ok();
				});
			});

			it('should be successfully scraped with bySiteStructure filename generator', function() {
				var scraperOptions = _.clone(options);
				var hostname = URL.parse(url).hostname;
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
