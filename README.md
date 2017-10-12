## Introduction
Download website to a local directory (including all css, images, js, etc.)

[![Build Status](https://img.shields.io/travis/website-scraper/node-website-scraper/master.svg?style=flat)](https://travis-ci.org/website-scraper/node-website-scraper)
[![Build status](https://ci.appveyor.com/api/projects/status/s7jxui1ngxlbgiav/branch/master?svg=true)](https://ci.appveyor.com/project/s0ph1e/node-website-scraper/branch/master)
[![Test Coverage](https://codeclimate.com/github/website-scraper/node-website-scraper/badges/coverage.svg)](https://codeclimate.com/github/website-scraper/node-website-scraper/coverage)
[![Code Climate](https://codeclimate.com/github/website-scraper/node-website-scraper/badges/gpa.svg)](https://codeclimate.com/github/website-scraper/node-website-scraper)
[![Dependency Status](https://david-dm.org/website-scraper/node-website-scraper.svg?style=flat)](https://david-dm.org/website-scraper/node-website-scraper)

[![Version](https://img.shields.io/npm/v/website-scraper.svg?style=flat)](https://www.npmjs.org/package/website-scraper)
[![Downloads](https://img.shields.io/npm/dm/website-scraper.svg?style=flat)](https://www.npmjs.org/package/website-scraper)
[![Gitter](https://badges.gitter.im/website-scraper/node-website-scraper.svg)](https://gitter.im/website-scraper/node-website-scraper?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

[![NPM Stats](https://nodei.co/npm/website-scraper.png?downloadRank=true&stars=true)](https://www.npmjs.org/package/website-scraper)

You can try it in [demo app](https://scraper.nepochataya.pp.ua/) ([source](https://github.com/website-scraper/web-scraper))

**Note:** by default dynamic websites (where content is loaded by js) may be saved not correctly because `website-scraper` doesn't execute js, it only parses http responses for html and css files. If you need to download dynamic website take a look on [website-scraper-phantom](https://github.com/website-scraper/node-website-scraper-phantom).


## Installation
```
npm install website-scraper
```

## Usage
```javascript
var scrape = require('website-scraper');
var options = {
  urls: ['http://nodejs.org/'],
  directory: '/path/to/save/',
};

// with promise
scrape(options).then((result) => {
	/* some code here */
}).catch((err) => {
	/* some code here */
});

// or with callback
scrape(options, (error, result) => {
	/* some code here */
});
```

## options
* [urls](#urls) - urls to download, *required*
* [directory](#directory) - path to save files, *required*
* [sources](#sources) - selects which resources should be downloaded
* [recursive](#recursive) - follow hyperlinks in html files
* [maxRecursiveDepth](#maxrecursivedepth) - maximum depth for hyperlinks
* [maxDepth](#maxdepth) - maximum depth for all dependencies
* [request](#request) - custom options for for [request](https://github.com/request/request)
* [subdirectories](#subdirectories) - subdirectories for file extensions
* [defaultFilename](#defaultfilename) - filename for index page
* [prettifyUrls](#prettifyurls) - prettify urls
* [ignoreErrors](#ignoreerrors) - whether to ignore errors on resource downloading
* [urlFilter](#urlfilter) - skip some urls
* [filenameGenerator](#filenamegenerator) - generate filename for downloaded resource
* [httpResponseHandler](#httpresponsehandler) - customize http response handling
* [resourceSaver](#resourcesaver) - customize resources saving
* [onResourceSaved](#onresourcesaved) - callback called when resource is saved
* [onResourceError](#onresourceerror) - callback called when resource's downloading is failed
* [updateMissingSources](#updatemissingsources) - update url for missing sources with absolute url
* [requestConcurrency](#requestconcurrency) - set maximum concurrent requests
 
Default options you can find in [lib/config/defaults.js](https://github.com/website-scraper/node-website-scraper/blob/master/lib/config/defaults.js) or get them using `scrape.defaults`.

#### urls
Array of objects which contain urls to download and filenames for them. **_Required_**.
```javascript
scrape({
  urls: [
    'http://nodejs.org/',	// Will be saved with default filename 'index.html'
    {url: 'http://nodejs.org/about', filename: 'about.html'},
    {url: 'http://blog.nodejs.org/', filename: 'blog.html'}
  ],
  directory: '/path/to/save'
}).then(console.log).catch(console.log);
```

#### directory
String, absolute path to directory where downloaded files will be saved. Directory should not exist. It will be created by scraper. **_Required_**.

#### sources
Array of objects to download, specifies selectors and attribute values to select files for downloading. By default scraper tries to download all possible resources.
```javascript
// Downloading images, css files and scripts
scrape({
  urls: ['http://nodejs.org/'],
  directory: '/path/to/save',
  sources: [
    {selector: 'img', attr: 'src'},
    {selector: 'link[rel="stylesheet"]', attr: 'href'},
    {selector: 'script', attr: 'src'}
  ]
}).then(console.log).catch(console.log);
```

#### recursive
Boolean, if `true` scraper will follow hyperlinks in html files. Don't forget to set `maxRecursiveDepth` to avoid infinite downloading. Defaults to `false`.

#### maxRecursiveDepth
Positive number, maximum allowed depth for hyperlinks. Other dependencies will be saved regardless of their depth. Defaults to `null` - no maximum recursive depth set. 

#### maxDepth
Positive number, maximum allowed depth for all dependencies. Defaults to `null` - no maximum depth set. 

#### request
Object, custom options for [request](https://github.com/request/request#requestoptions-callback). Allows to set cookies, userAgent, etc.
```javascript
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  request: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 4 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19'
    }
  }
}).then(console.log).catch(console.log);
```

#### subdirectories
Array of objects, specifies subdirectories for file extensions. If `null` all files will be saved to `directory`.
```javascript
/* Separate files into directories:
  - `img` for .jpg, .png, .svg (full path `/path/to/save/img`)
  - `js` for .js (full path `/path/to/save/js`)
  - `css` for .css (full path `/path/to/save/css`)
*/
scrape({
  urls: ['http://example.com'],
  directory: '/path/to/save',
  subdirectories: [
    {directory: 'img', extensions: ['.jpg', '.png', '.svg']},
    {directory: 'js', extensions: ['.js']},
    {directory: 'css', extensions: ['.css']}
  ]
}).then(console.log).catch(console.log);
```

#### defaultFilename
String, filename for index page. Defaults to `index.html`.

#### prettifyUrls
Boolean, whether urls should be 'prettified', by having the `defaultFilename` removed. Defaults to `false`.

#### ignoreErrors
Boolean, if `true` scraper will continue downloading resources after error occurred, if `false` - scraper will finish process and return error. Defaults to `true`.

#### urlFilter
Function which is called for each url to check whether it should be scraped. Defaults to `null` - no url filter will be applied.
```javascript
// Links to other websites are filtered out by the urlFilter
var scrape = require('website-scraper');
scrape({
  urls: ['http://example.com/'],
  urlFilter: function(url){
    return url.indexOf('http://example.com') === 0;
  },
  directory: '/path/to/save'
}).then(console.log).catch(console.log);
```

#### filenameGenerator
String (name of the bundled filenameGenerator) or function. Filename generator determines path in file system where the resource will be saved.

###### byType (default)
When the `byType` filenameGenerator is used the downloaded files are saved by extension (as defined by the `subdirectories` setting) or directly in the `directory` folder, if no subdirectory is specified for the specific extension.

###### bySiteStructure
When the `bySiteStructure` filenameGenerator is used the downloaded files are saved in `directory` using same structure as on the website:
- `/` => `DIRECTORY/example.com/index.html`
- `/about` => `DIRECTORY/example.com/about/index.html`
- `//cdn.example.com/resources/jquery.min.js` => `DIRECTORY/cdn.example.com/resources/jquery.min.js`

```javascript
var scrape = require('website-scraper');
scrape({
  urls: ['http://example.com/'],
  urlFilter: (url) => url.startsWith('http://example.com'), // Filter links to other websites
  recursive: true,
  maxRecursiveDepth: 10,
  filenameGenerator: 'bySiteStructure',
  directory: '/path/to/save'
}).then(console.log).catch(console.log);
```

###### function
Custom function which generates filename. It takes 3 arguments: resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object, options - object passed to scrape function, occupiedFileNames - array of occupied filenames. Should return string - relative to `directory` path for specified resource. 
```javascript
const scrape = require('website-scraper');
const crypto = require('crypto');

scrape({
  urls: ['http://example.com'],
  directory: '/path/to/save',
  /* Generate random filename */
  filenameGenerator: (resource, options, occupiedFileNames) => {
    return crypto.randomBytes(20).toString('hex'); 
  }
}).then(console.log).catch(console.log);
```

#### httpResponseHandler
Function which is called on each response, allows to customize resource or reject its downloading.
It takes 1 argument - response object of [request](https://github.com/request/request) module and should return resolved `Promise` if resource should be downloaded or rejected with Error `Promise` if it should be skipped.
Promise should be resolved with:
* `string` which contains response body
* or object with properies `body` (response body, string) and `metadata` - everything you want to save for this resource (like headers, original text, timestamps, etc.), scraper will not use this field at all, it is only for result.
```javascript
// Rejecting resources with 404 status and adding metadata to other resources
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  httpResponseHandler: (response) => {
  	if (response.statusCode === 404) {
		return Promise.reject(new Error('status is 404'));
	} else {
		// if you don't need metadata - you can just return Promise.resolve(response.body)
		return Promise.resolve({
			body: response.body,
			metadata: {
				headers: response.headers,
				someOtherData: [ 1, 2, 3 ]
			}
		});
	}
  }
}).then(console.log).catch(console.log);
```
Scrape function resolves with array of [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) objects which contain `metadata` property from `httpResponseHandler`.

#### resourceSaver
Class which saves [Resources](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js), should have methods `saveResource` and `errorCleanup` which return Promises. Use it to save files where you need: to dropbox, amazon S3, existing directory, etc. By default all files are saved in local file system to new directory passed in `directory` option (see [lib/resource-saver/index.js](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource-saver/index.js)).
```javascript
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  resourceSaver: class MyResourceSaver {
  	saveResource (resource) {/* code to save file where you need */}
  	errorCleanup (err) {/* code to remove all previously saved files in case of error */}
  }
}).then(console.log).catch(console.log);
```

#### onResourceSaved
Function called each time when resource is saved to file system. Callback is called with [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object. Defaults to `null` - no callback will be called.
```javascript
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  onResourceSaved: (resource) => {
  	console.log(`Resource ${resource} was saved to fs`);
  }
})
```

#### onResourceError
Function called each time when resource's downloading/handling/saving to fs was failed. Callback is called with - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object and `Error` object. Defaults to `null` - no callback will be called.
```javascript
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  onResourceError: (resource, err) => {
  	console.log(`Resource ${resource} was not saved because of ${err}`);
  }
})
```

#### updateMissingSources
Boolean, if `true` scraper will set absolute urls for all failing `sources`, if `false` - it will leave them as is (which may cause incorrectly displayed page).
Also can contain array of `sources` to update (structure is similar to [sources](#sources)).
Defaults to `false`.
```javascript
// update all failing img srcs with absolute url
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  sources: [{selector: 'img', attr: 'src'}],
  updateMissingSources: true
});

// download nothing, just update all img srcs with absolute urls
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  sources: [],
  updateMissingSources: [{selector: 'img', attr: 'src'}] 
});

```

#### requestConcurrency
Number, maximum amount of concurrent requests. Defaults to `Infinity`.


## callback 
Callback function, optional, includes following parameters:
  - `error`: if error - `Error` object, if success - `null`
  - `result`: if error - `null`, if success - array of [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) objects containing:
    - `url`: url of loaded page
    - `filename`: filename where page was saved (relative to `directory`)
    - `children`: array of children Resources

## Log and debug
This module uses [debug](https://github.com/visionmedia/debug) to log events. To enable logs you should use environment variable `DEBUG`.
Next command will log everything from website-scraper
```bash
export DEBUG=website-scraper*; node app.js
```

Module has different loggers for levels: `website-scraper:error`, `website-scraper:warn`, `website-scraper:info`, `website-scraper:debug`, `website-scraper:log`. Please read [debug](https://github.com/visionmedia/debug) documentation to find how to include/exclude specific loggers.
