##Introduction
Node.js module for website's scraping with images, css, js, etc. Uses cheerio, request, bluebird, fs-extra, underscore.

[![Build Status](https://travis-ci.org/s0ph1e/node-website-scraper.svg?branch=master)](https://travis-ci.org/s0ph1e/node-website-scraper)
[![Version](https://img.shields.io/npm/v/website-scraper.svg)](https://www.npmjs.org/package/website-scraper)
[![Downloads](https://img.shields.io/npm/dm/website-scraper.svg)](https://www.npmjs.org/package/website-scraper)

[![NPM Stats](https://nodei.co/npm/website-scraper.png?downloadRank=true&stars=true)](https://www.npmjs.org/package/website-scraper)

##Installation
`npm install website-scraper`

##Usage
```javascript
var scraper = require('website-scraper'); 
scraper.scrape({
  url: 'http://nodejs.org/',
  path: '/path/to/save/',
}, function (error, result){
	/* some code here */
});
```

##API
### scrape(options, callback)
Makes request to `url` and saves all files found with `srcToLoad` to `path`. 

**options** - object containing next options:

 - `url:` url to load *(required)*
 - `path:` path to save loaded files *(required)*
 - `log:` boolean indicates whether to write the log to console *(optional, default: false)*
 - `indexFile:` filename for index page *(optional, default: 'index.html')*
 - `srcToLoad:` array of objects to load, specifies selectors and attribute values to select files for loading *(optional, see default value in `lib/defaults.js`)*
 - `directories:` array of objects, specifies relative directories for extensions. If `null` all files will be saved to `path` *(optional, see example below)*
 
 
**callback** - callback function *(optional)*, includes following parameters:
 
  - `error:` if error - `Error object`, if success - `null`
  - `result:` if error - `null`, if success - object containing:
    - `html:` html code of index page


##Examples
Let's scrape [http://nodejs.org/](http://nodejs.org/) with images, css, js files and save them to `/path/to/save/`. Index page will be named 'myIndex.html', files will be separated into directories:

  - `img` for .jpg, .png (full path `/path/to/save/img`) 
  - `js` for .js (full path `/path/to/save/js`)
  - `css` for .css (full path `/path/to/save/css`)
  - `font` for .ttf, .woff, .eot, .svg (full path `/path/to/save/font`)

```javascript
scraper.scrape({
  url: 'http://nodejs.org/',
  path: '/path/to/save',
  indexFile: 'myIndex.html',
  srcToLoad: [
    {selector: 'img', attr: 'src'},
    {selector: 'link[rel="stylesheet"]', attr: 'href'},
    {selector: 'script', attr: 'src'}
  ],
  directories: [
    {directory: 'img', extensions: ['.jpg', '.png']},
    {directory: 'js', extensions: ['.js']},
    {directory: 'css', extensions: ['.css']},
    {directory: 'fonts', extensions: ['.ttf', '.woff', '.eot', '.svg']}
  ]
}, function (error, result){
	console.log(result);
});
```

##Dependencies

 - cheerio
 - request
 - bluebird
 - fs-extra
 - underscore
