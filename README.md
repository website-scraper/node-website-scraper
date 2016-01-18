## Introduction
Download website to a local directory (including all css, images, js, etc.)

[![Build Status](https://img.shields.io/travis/s0ph1e/node-website-scraper/master.svg?style=flat)](https://travis-ci.org/s0ph1e/node-website-scraper)
[![Test Coverage](https://codeclimate.com/github/s0ph1e/node-website-scraper/badges/coverage.svg)](https://codeclimate.com/github/s0ph1e/node-website-scraper/coverage)
[![Code Climate](https://codeclimate.com/github/s0ph1e/node-website-scraper/badges/gpa.svg)](https://codeclimate.com/github/s0ph1e/node-website-scraper)
[![Version](https://img.shields.io/npm/v/website-scraper.svg?style=flat)](https://www.npmjs.org/package/website-scraper)
[![Downloads](https://img.shields.io/npm/dm/website-scraper.svg?style=flat)](https://www.npmjs.org/package/website-scraper)
[![Dependency Status](https://david-dm.org/s0ph1e/node-website-scraper.svg?style=flat)](https://david-dm.org/s0ph1e/node-website-scraper)

[![NPM Stats](https://nodei.co/npm/website-scraper.png?downloadRank=true&stars=true)](https://www.npmjs.org/package/website-scraper)

You can try it in [demo app](https://scraper.nepochataya.pp.ua/) ([source](https://github.com/s0ph1e/web-scraper))

## Installation
```
npm install website-scraper
```

## Usage
```javascript
var scraper = require('website-scraper');
var options = {
  urls: ['http://nodejs.org/'],
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

## API
### scrape(options, callback)
Makes requests to `urls` and saves all files found with `sources` to `directory`.

**options** - object containing next options:

 - `urls:` array of urls to load and filenames for them *(required, see example below)*
 - `directory:` path to save loaded files *(required)*
 - `defaultFilename:` filename for index page *(optional, default: 'index.html')*
 - `sources:` array of objects to load, specifies selectors and attribute values to select files for loading *(optional, see default value in `lib/config/defaults.js`)*
 - `subdirectories:` array of objects, specifies subdirectories for file extensions. If `null` all files will be saved to `directory` *(optional, see example below)*
 - `request`: object, custom options for [request](https://github.com/request/request#requestoptions-callback) *(optional, see example below)*
 - `recursive`: boolean, if `true` scraper will follow anchors in html files. Don't forget to set `maxDepth` to avoid infinite downloading *(optional, see example below)*
 - `maxDepth`: positive number, maximum allowed depth for dependencies *(optional, see example below)*


**callback** - callback function *(optional)*, includes following parameters:

  - `error:` if error - `Error` object, if success - `null`
  - `result:` if error - `null`, if success - array if objects containing:
    - `url:` url of loaded page
    - `filename:` filename where page was saved (relative to `directory`)


## Examples
#### Example 1
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
var scraper = require('website-scraper');
scraper.scrape({
  urls: [
    'http://nodejs.org/',	// Will be saved with default filename 'index.html'
    {url: 'http://nodejs.org/about', filename: 'about.html'},
    {url: 'http://blog.nodejs.org/', filename: 'blog.html'}
  ],
  directory: '/path/to/save',
  subdirectories: [
    {directory: 'img', extensions: ['.jpg', '.png', '.svg']},
    {directory: 'js', extensions: ['.js']},
    {directory: 'css', extensions: ['.css']}
  ],
  sources: [
    {selector: 'img', attr: 'src'},
    {selector: 'link[rel="stylesheet"]', attr: 'href'},
    {selector: 'script', attr: 'src'}
  ],
  request: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 4 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19'
    }
  }
}).then(function (result) {
  console.log(result);
}).catch(function(err){
  console.log(err);
});
```

#### Example 2. Recursive downloading
```javascript
// Links from example.com will be followed
// Links from links will be ignored because theirs depth = 2 is greater than maxDepth
var scraper = require('website-scraper');
scraper.scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  recursive: true,
  maxDepth: 1
}).then(console.log).catch(console.log);
```
