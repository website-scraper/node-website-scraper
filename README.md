[![Version](https://img.shields.io/npm/v/website-scraper.svg?style=flat)](https://www.npmjs.org/package/website-scraper)
[![Downloads](https://img.shields.io/npm/dm/website-scraper.svg?style=flat)](https://www.npmjs.org/package/website-scraper)
[![Node.js CI](https://github.com/website-scraper/node-website-scraper/actions/workflows/node.js.yml/badge.svg)](https://github.com/website-scraper/node-website-scraper)
[![Test Coverage](https://codeclimate.com/github/website-scraper/node-website-scraper/badges/coverage.svg)](https://codeclimate.com/github/website-scraper/node-website-scraper/coverage)
[![Coverage Status](https://coveralls.io/repos/github/website-scraper/node-website-scraper/badge.svg?branch=master)](https://coveralls.io/github/website-scraper/node-website-scraper?branch=master)


# website-scraper

[Options](#usage) | [Plugins](#plugins) | [Log and debug](#log-and-debug) | [Frequently Asked Questions](https://github.com/website-scraper/node-website-scraper/blob/master/docs/FAQ.md) | [Contributing](https://github.com/website-scraper/node-website-scraper/blob/master/CONTRIBUTING.md) | [Code of Conduct](https://github.com/website-scraper/node-website-scraper/blob/master/CODE_OF_CONDUCT.md)


Download website to local directory (including all css, images, js, etc.)

Try it using [demo app](https://github.com/website-scraper/demo)

**Note:** by default dynamic websites (where content is loaded by js) may be saved not correctly because `website-scraper` doesn't execute js, it only parses http responses for html and css files. If you need to download dynamic website take a look on [website-scraper-puppeteer](https://github.com/website-scraper/website-scraper-puppeteer).

This module is an Open Source Software maintained by one developer in free time. If you want to thank the author of this module you can use [GitHub Sponsors](https://github.com/sponsors/s0ph1e) or [Patreon](https://www.patreon.com/s0ph1e).

## Requirements
* nodejs version >= 18.17
* website-scraper since v5 is pure ESM (it doesn't work with CommonJS), [read more in release v5.0.0 docs](https://github.com/website-scraper/node-website-scraper/releases/tag/v5.0.0)

## Installation
```
npm install website-scraper
```

## Usage
```javascript
import scrape from 'website-scraper'; // only as ESM, no CommonJS
const options = {
  urls: ['http://nodejs.org/'],
  directory: '/path/to/save/'
};

// with async/await
const result = await scrape(options);

// with promise
scrape(options).then((result) => {});
```

## options
* [urls](#urls) - urls to download, *required*
* [directory](#directory) - path to save files, *required*
* [sources](#sources) - selects which resources should be downloaded
* [recursive](#recursive) - follow hyperlinks in html files
* [maxRecursiveDepth](#maxrecursivedepth) - maximum depth for hyperlinks
* [maxDepth](#maxdepth) - maximum depth for all dependencies
* [request](#request) - custom options for http module [got](https://github.com/sindresorhus/got#options)
* [subdirectories](#subdirectories) - subdirectories for file extensions
* [defaultFilename](#defaultfilename) - filename for index page
* [prettifyUrls](#prettifyurls) - prettify urls
* [ignoreErrors](#ignoreerrors) - whether to ignore errors on resource downloading
* [urlFilter](#urlfilter) - skip some urls
* [filenameGenerator](#filenamegenerator) - generate filename for downloaded resource
* [requestConcurrency](#requestconcurrency) - set maximum concurrent requests
* [plugins](#plugins) - plugins, allow to customize filenames, request options, response handling, saving to storage, etc.

Default options you can find in [lib/config/defaults.js](https://github.com/website-scraper/node-website-scraper/blob/master/lib/config/defaults.js) or get them using 
```javascript
import defaultOptions from 'website-scraper/defaultOptions';
```

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
});
```

#### directory
String, absolute path to directory where downloaded files will be saved. Directory should not exist. It will be created by scraper. **_Required_**.
How to download website to existing directory and why it's not supported by default - check [here](https://github.com/website-scraper/node-website-scraper/blob/master/docs/FAQ.md#q-im-getting-directory-exists-error-can-i-save-website-to-existing-directory).

#### sources
Array of objects to download, specifies selectors and attribute values to select files for downloading. By default scraper tries to download all possible resources. Scraper uses cheerio to select html elements so `selector` can be any [selector that cheerio supports](https://github.com/cheeriojs/cheerio#selectors).
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
});
```

#### recursive
Boolean, if `true` scraper will follow hyperlinks in html files. Don't forget to set `maxRecursiveDepth` to avoid infinite downloading. Defaults to `false`.

#### maxRecursiveDepth
Positive number, maximum allowed depth for hyperlinks. Other dependencies will be saved regardless of their depth. Defaults to `null` - no maximum recursive depth set.

#### maxDepth
Positive number, maximum allowed depth for all dependencies. Defaults to `null` - no maximum depth set.
In most of cases you need [maxRecursiveDepth](#maxRecursiveDepth) instead of this option.

The difference between [maxRecursiveDepth](#maxRecursiveDepth) and [maxDepth](#maxDepth) is that
* maxDepth is for all type of resources, so if you have
  > maxDepth=1 AND html (depth 0) ⟶ html (depth 1) ⟶ img (depth 2)

  last image will be filtered out by depth

* maxRecursiveDepth is only for html resources, so if you have
  > maxRecursiveDepth=1 AND html (depth 0) ⟶ html (depth 1) ⟶ img (depth 2)

  only html resources with depth 2 will be filtered out, last image will be downloaded

#### request
Object, custom options for http module [got](https://github.com/sindresorhus/got#options) which is used inside website-scraper. Allows to set retries, cookies, userAgent, encoding, etc.
```javascript
// use same request options for all resources
scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  request: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 4 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19'
    }
  }
});
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
});
```

#### defaultFilename
String, filename for index page. Defaults to `index.html`.

#### prettifyUrls
Boolean, whether urls should be 'prettified', by having the `defaultFilename` removed. Defaults to `false`.

#### ignoreErrors
Boolean, if `true` scraper will continue downloading resources after error occurred, if `false` - scraper will finish process and return error. Defaults to `false`.

#### urlFilter
Function which is called for each url to check whether it should be scraped. Defaults to `null` - no url filter will be applied.
```javascript
// Links to other websites are filtered out by the urlFilter
scrape({
  urls: ['http://example.com/'],
  urlFilter: function(url) {
    return url.indexOf('http://example.com') === 0;
  },
  directory: '/path/to/save'
});
```

#### filenameGenerator
String (name of the bundled filenameGenerator). Filename generator determines path in file system where the resource will be saved.

###### byType (default)
When the `byType` filenameGenerator is used the downloaded files are saved by extension (as defined by the `subdirectories` setting) or directly in the `directory` folder, if no subdirectory is specified for the specific extension.

###### bySiteStructure
When the `bySiteStructure` filenameGenerator is used the downloaded files are saved in `directory` using same structure as on the website:
- `/` => `DIRECTORY/example.com/index.html`
- `/about` => `DIRECTORY/example.com/about/index.html`
- `//cdn.example.com/resources/jquery.min.js` => `DIRECTORY/cdn.example.com/resources/jquery.min.js`

```javascript
scrape({
  urls: ['http://example.com/'],
  urlFilter: (url) => url.startsWith('http://example.com'), // Filter links to other websites
  recursive: true,
  maxRecursiveDepth: 10,
  filenameGenerator: 'bySiteStructure',
  directory: '/path/to/save'
});
```

#### requestConcurrency
Number, maximum amount of concurrent requests. Defaults to `Infinity`.


#### plugins

Plugins allow to extend scraper behaviour

* [Built-in plugins](#built-in-plugins)
* [Existing plugins](#existing-plugins)
* [Create plugin](#create-plugin)
* Create action
    * [beforeStart](#beforestart)
    * [afterFinish](#afterfinish)
    * [error](#error)
    * [beforeRequest](#beforerequest)
    * [afterResponse](#afterresponse)
    * [onResourceSaved](#onresourcesaved)
    * [onResourceError](#onresourceerror)
    * [saveResource](#saveresource)
    * [generateFilename](#generatefilename)
    * [getReference](#getreference)

##### Built-in plugins
Scraper has built-in plugins which are used by default if not overwritten with custom plugins. You can find them in [lib/plugins](lib/plugins) directory. Thease plugins are intended for internal use but can be coppied if the behaviour of the plugins needs to be extended / changed.

##### Existing plugins
* [website-scraper-puppeteer](https://github.com/website-scraper/website-scraper-puppeteer) - download dynamic (rendered with js) websites using puppeteer
* [website-scraper-existing-directory](https://github.com/website-scraper/website-scraper-existing-directory) - save files to existing directory

##### Create plugin

Plugin is object with `.apply` method, can be used to change scraper behavior.

`.apply` method takes one argument - `registerAction` function which allows to add handlers for different actions. Action handlers are functions that are called by scraper on different stages of downloading website. For example `generateFilename` is called to generate filename for resource based on its url, `onResourceError` is called when error occured during requesting/handling/saving resource.

You can add multiple plugins which register multiple actions. Plugins will be applied in order they were added to options.
All actions should be regular or async functions. Scraper will call actions of specific type in order they were added and use result (if supported by action type) from last action call.

List of supported actions with detailed descriptions and examples you can find below.
```javascript
class MyPlugin {
	apply(registerAction) {
		registerAction('beforeStart', async ({options}) => {});
		registerAction('afterFinish', async () => {});
		registerAction('error', async ({error}) => {console.error(error)});
		registerAction('beforeRequest', async ({resource, requestOptions}) => ({requestOptions}));
		registerAction('afterResponse', async ({response}) => response.body);
		registerAction('onResourceSaved', ({resource}) => {});
		registerAction('onResourceError', ({resource, error}) => {});
		registerAction('saveResource', async ({resource}) => {});
		registerAction('generateFilename', async ({resource}) => {})
		registerAction('getReference', async ({resource, parentResource, originalReference}) => {})
	}
}

scrape({
  urls: ['http://example.com/'],
  directory: '/path/to/save',
  plugins: [ new MyPlugin() ]
});
```

##### beforeStart
Action `beforeStart` is called before downloading is started. It can be used to initialize something needed for other actions.

Parameters - object which includes:
* options - scraper normalized options object passed to scrape function
* utils - scraper [utils](https://github.com/website-scraper/node-website-scraper/blob/master/lib/utils/index.js)

```javascript
registerAction('beforeStart', async ({options, utils}) => {});
```

##### afterFinish
Action afterFinish is called after all resources downloaded or error occurred. Good place to shut down/close something initialized and used in other actions.

No parameters.
```javascript
registerAction('afterFinish', async () => {});
```

##### error
Action error is called when error occurred.

Parameters - object which includes:
* error - Error object
```javascript
registerAction('error', async ({error}) => {console.log(error)});
```

##### beforeRequest
Action beforeRequest is called before requesting resource. You can use it to customize request options per resource, for example if you want to use different encodings for different resource types or add something to querystring.

Parameters - object which includes:
* resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object
* requestOptions - default options for http module [got](https://github.com/sindresorhus/got#options) or options returned by previous beforeRequest action call

Should return object which includes custom options for [got](https://github.com/sindresorhus/got#options) module.
If multiple actions `beforeRequest` added - scraper will use `requestOptions` from last one.
```javascript
// Add ?myParam=123 to querystring for resource with url 'http://example.com'
registerAction('beforeRequest', async ({resource, requestOptions}) => {
	if (resource.getUrl() === 'http://example.com') {
		return {requestOptions: extend(requestOptions, {searchParams: {myParam: 123}})};
	}
	return {requestOptions};
});

// Add random delays between requests
registerAction('beforeRequest', async ({resource, requestOptions}) => {
	const time = Math.round(Math.random() * 10000);
	await new Promise((resolve) => setTimeout(resolve, time));
	return {requestOptions};
});
```

##### afterResponse
Action afterResponse is called after each response, allows to customize resource or reject its saving.

Parameters - object which includes:
* response - response object from http module [got](https://github.com/sindresorhus/got#response)

Should return resolved `Promise` if resource should be saved or rejected with Error `Promise` if it should be skipped.
Promise should be resolved with:
* the `response` object with the `body` modified in place as necessary.
* or object with properties 
  * `body` (response body, string)
  * `encoding` (`binary` or `utf8`) used to save the file, binary used by default.
  * `metadata` (object) - everything you want to save for this resource (like headers, original text, timestamps, etc.), scraper will not use this field at all, it is only for result.
* a binary `string`. This is advised against because of the binary assumption being made can foul up saving of `utf8` responses to the filesystem. 

If multiple actions `afterResponse` added - scraper will use result from last one.
```javascript
// Do not save resources which responded with 404 not found status code
registerAction('afterResponse', ({response}) => {
	if (response.statusCode === 404) {
			return null;
	} else {
		// if you don't need metadata - you can just return Promise.resolve(response.body)
		return {
			body: response.body,
			metadata: {
				headers: response.headers,
				someOtherData: [ 1, 2, 3 ]
			},
      encoding: 'utf8'
		}
	}
});
```

##### onResourceSaved
Action onResourceSaved is called each time after resource is saved (to file system or other storage with 'saveResource' action).

Parameters- object which includes:
* resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object

Scraper ignores result returned from this action and does not wait until it is resolved
```javascript
registerAction('onResourceSaved', ({resource}) => console.log(`Resource ${resource.url} saved!`));
```

##### onResourceError
Action onResourceError is called each time when resource's downloading/handling/saving to was failed

Parameters- object which includes:
* resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object
* error - Error object

Scraper ignores result returned from this action and does not wait until it is resolved
```javascript
registerAction('onResourceError', ({resource, error}) => console.log(`Resource ${resource.url} has error ${error}`));
```

##### generateFilename
Action generateFilename is called to determine path in file system where the resource will be saved.

Parameters - object which includes:
* resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object
* responseData - object returned from afterResponse action, contains `url`, `mimeType`, `body`, `metadata` properties

Should return object which includes:
* filename - String, relative to `directory` path for specified resource

If multiple actions `generateFilename` added - scraper will use result from last one.

Default plugins which generate filenames: [byType](https://github.com/website-scraper/node-website-scraper/blob/master/lib/plugins/generate-filenamy-by-type-plugin.js), [bySiteStructure](https://github.com/website-scraper/node-website-scraper/blob/master/lib/plugins/generate-filenamy-by-site-structure-plugin.js)
```javascript
// Generate random filename
const crypto = require('crypto');
registerAction('generateFilename', ({resource}) => {
  return {filename: crypto.randomBytes(20).toString('hex')};
});
```

##### getReference
Action getReference is called to retrieve reference to resource for parent resource. Can be used to customize reference to resource, for example, update missing resource (which was not loaded) with absolute url. By default reference is relative path from `parentResource` to `resource` (see [GetRelativePathReferencePlugin](https://github.com/website-scraper/node-website-scraper/blob/master/lib/plugins/get-relative-path-reference-plugin.js)).

Parameters - object which includes:
* resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object
* parentResource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object
* originalReference - string, original reference to `resource` in `parentResource`

Should return object which includes:
* reference - string or null, reference to `resource` for `parentResource`. If you don't want to update reference - return null

If multiple actions `getReference` added - scraper will use result from last one.
```javascript
// Use relative filenames for saved resources and absolute urls for missing
registerAction('getReference', ({resource, parentResource, originalReference}) => {
  if (!resource) {
    return {reference: parentResource.url + originalReference}
  }
  return {reference: utils.getRelativePath(parentResource.filename, resource.filename)};
});
```


##### saveResource
Action saveResource is called to save file to some storage. Use it to save files where you need: to dropbox, amazon S3, existing directory, etc. By default all files are saved in local file system to new directory passed in `directory` option (see [SaveResourceToFileSystemPlugin](https://github.com/website-scraper/node-website-scraper/blob/master/lib/plugins/save-resource-to-fs-plugin.js)).

Parameters - object which includes:
* resource - [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) object

If multiple actions `saveResource` added - resource will be saved to multiple storages.
```javascript
registerAction('saveResource', async ({resource}) => {
  const filename = resource.getFilename();
  const text = resource.getText();
  await saveItSomewhere(filename, text);
});
```

## result
Array of [Resource](https://github.com/website-scraper/node-website-scraper/blob/master/lib/resource.js) objects containing:
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
