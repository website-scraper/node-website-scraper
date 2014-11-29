##Introduction
Node.js module for website's scraping with images, css, js, etc. 

[![Build Status](https://travis-ci.org/s0ph1e/node-website-scraper.svg?branch=master)](https://travis-ci.org/s0ph1e/node-website-scraper)
[![Version](https://img.shields.io/npm/v/website-scraper.svg)](https://www.npmjs.org/package/website-scraper)
[![Downloads](https://img.shields.io/npm/dm/website-scraper.svg)](https://www.npmjs.org/package/website-scraper)

[![NPM Stats](https://nodei.co/npm/website-scraper.png?downloadRank=true&stars=true)](https://www.npmjs.org/package/website-scraper)

##Installation
`npm install website-scraper`

##Usage
```javascript
var scraper = require('website-scraper'); 
var options = {
  url: 'http://nodejs.org/',
  directory: '/path/to/save/',
};

// with callback
scraper.scrape(options, function (error, result) {
	/* some code here */
});

// or with promise
scraper.scrape(options).then(function (result) {
	/* some code here */
});
```

##API
### scrape(options, callback)
Makes request to `url` and saves all files found with `srcToLoad` to `directory`. 

**options** - object containing next options:

 - `url:` url to load *(required)*
 - `directory:` path to save loaded files *(required)*
 - `paths:` array of objects, contains urls or relative paths to load and filenames for them (if is not set only `url` will be loaded) *(optional, see example below)*
 - `log:` boolean indicates whether to write the log to console *(optional, default: false)*
 - `indexFile:` filename for index page *(optional, default: 'index.html')*
 - `srcToLoad:` array of objects to load, specifies selectors and attribute values to select files for loading *(optional, see default value in `lib/defaults.js`)*
 - `subdirectories:` array of objects, specifies subdirectories for extensions. If `null` all files will be saved to `directory` *(optional, see example below)*
 
 
**callback** - callback function *(optional)*, includes following parameters:
 
  - `error:` if error - `Error object`, if success - `null`
  - `result:` if error - `null`, if success - array if objects containing:
    - `url:` url of loaded page
    - `filename:` absolute filename where page was saved


##Examples
Let's scrape some pages from [http://nodejs.org/](http://nodejs.org/) with images, css, js files and save them to `/path/to/save/`. 
Imagine we want to load:
  - [Home page](http://nodejs.org/) to `index.html`
  - [About page](http://nodejs.org/about/) to `about.html`
  - [Blog](http://blog.nodejs.org/) to `blog.html`
  
and separate files into directories:

  - `img` for .jpg, .png, .svg (full path `/path/to/save/img`) 
  - `js` for .js (full path `/path/to/save/js`)
  - `css` for .css (full path `/path/to/save/css`)

```javascript
scraper.scrape({
  url: 'http://nodejs.org/',
  directory: '/path/to/save',
  paths: [
    {path: '/', filename: 'index.html'},
    {path: '/about', filename: 'about.html'},
    {url: 'http://blog.nodejs.org/', filename: 'blog.html'}
  ],
  subdirectories: [
    {directory: 'img', extensions: ['.jpg', '.png', '.svg']},
    {directory: 'js', extensions: ['.js']},
    {directory: 'css', extensions: ['.css']}
  ],
  srcToLoad: [
    {selector: 'img', attr: 'src'},
    {selector: 'link[rel="stylesheet"]', attr: 'href'},
    {selector: 'script', attr: 'src'}
  ]
}).then(function (result) {
  console.log(result);
});
```

##Dependencies

 - cheerio
 - request
 - bluebird
 - fs-extra
 - underscore
