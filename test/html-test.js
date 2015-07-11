var should = require('should');
var sinon = require('sinon');
var nock = require('nock');
var fs = require('fs-extra');
var Scraper = require('../lib/scraper');
var PageObject = require('../lib/page-object');
var loadHtml = require('../lib/file-handlers/css');

var testDirname = __dirname + '/.tmp/html';
var defaultScraperOpts = {
	urls: [ 'http://example.com' ],
	directory: testDirname,
	subdirectories: null
};
var scraper;

describe('Html handler', function () {
	describe('#loadHtml(context, pageObject)', function() {

		beforeEach(function() {
			scraper = new Scraper(defaultScraperOpts);
			return scraper.beforeLoad();
		});

		afterEach(function() {
			fs.remove(testDirname);
		});

	});
});
