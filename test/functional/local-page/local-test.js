var scraper = require('../../../index');
var fs = require('fs');
var path = require('path');

// 'index.html' contains local assets, except for 'jquery'
// that it will be downloaded
var options = {
  urls: [
    'file:///' + __dirname + path.sep + 'local-website' + path.sep + 'index.html'
  ],
  directory: __dirname + '/local-website-copy',
};

scraper.scrape(options, function (error, result) {
  if (error) {
    console.log ('ERROR:');
    console.log (error);
  }
  if (result) {
    console.log ('RESULT:');
    console.log (result);
  }
});
