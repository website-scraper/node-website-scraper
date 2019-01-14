# Frequently Asked Questions

### Q: website-scraper freezes/runs out of memory/does not download my website
If you have really large website - scraper tries to download too much pages and freezes. 

I'd suggest to:
* ensure that you're trying to download only what you need. To track what scraper is doing you can use `debug` [as described in readme](https://github.com/website-scraper/node-website-scraper#log-and-debug)
* add [urlFilter](https://github.com/website-scraper/node-website-scraper#urlfilter) to filter out resources from other domains
* decrease [maxRecursiveDepth](https://github.com/website-scraper/node-website-scraper#maxrecursivedepth) to limit dowloaded resources
* increase memory limit for node process `node --max-old-space-size=8192 app.js // to increase memory 8gb`

### Q: I'm getting Directory Exists error. Can I save website to existing directory?
By default attempt to save to existing directory throws errors. 
It is expected behavior - new directory is required for each scrape to prevent modifications of existing files.
You can modify this behavior by using [website-scraper-existing-directory](https://github.com/website-scraper/website-scraper-existing-directory) plugin or create your own [plugin](https://github.com/website-scraper/node-website-scraper#plugins) with `saveResource` action. 

Keep in mind that saving to existing directory may overwrite your files. Be careful with it!

### Q: Why website with javascript is not downloaded correcly?
By default dynamic websites (where content is loaded by js) may be saved not correctly because `website-scraper` doesn't execute js, it only parses http responses for html and css files. 
If you need to download dynamic website take a look on [website-scraper-puppeteer](https://github.com/website-scraper/website-scraper-puppeteer) or [website-scraper-phantom](https://github.com/website-scraper/node-website-scraper-phantom). It can handle javascript but scraping will take much more time.

### Q: Can I download files to amazon S3/dropbox/database/other place?
Yes. To save resources where you need you can implement plugin with [saveResource](https://github.com/website-scraper/node-website-scraper#saveresource) action.

### Q: How can I keep resources under the same original path? Can I customize resource path?
If you want resources to have exactly same path as on original website - you can try [filenameGenerator](https://github.com/website-scraper/node-website-scraper#bysitestructure) option with value `'bySiteStructure'`.
If `byType`(default) and `bySiteStructure` filename generators are not suitable - you can implement your own [plugin](https://github.com/website-scraper/node-website-scraper#plugins) with `generateFilename` action

### Q: What maxDepth, maxRecursiveDepth should I use?
TLDR: don't use large maxRecursiveDepth, it may try to download whole internet, take a very long time and large space on disk.

Imagine you are trying to download page with 20 links to other pages. Other pages also contain 20 links to other pages.

![max recursive depth example](https://github.com/website-scraper/node-website-scraper/blob/master/docs/images/max-recursive-depth.png)

Even if each page (with resources like images) has size 200Kb (which is quite optimistic expectation, it may be up to 10Mb) and it takes 200 ms to download page, setting maxRecursiveDepth to 5 will lead to:
```
200 + 20*200 + 20^2*200 + 20^3*200 + 20^4*200 + 20^5*200 = 673684200 Kb = 657894.72 Mb = 642.47 Gb to download
200 + 20*200 + 20^2*200 + 20^3*200 + 20^4*200 + 20^5*200 = 673684200 ms = 673684.2 s = 11228.07 m = 187.1345 h = 7.79 days - very long time
```
Setting maxRecursiveDepth to 3 in the same case will lead to:
```
200 + 20*200 + 20^2*200 + 20^3*200 = 1684200 Kb = 1644.72 Mb = 1.6 Gb to download
200 + 20*200 + 20^2*200 + 20^3*200 = 1684200 ms = 1684.2 s = 28.07 m time to download
```
much better comparing to maxRecursiveDepth = 5, isn't it?

Setting maxRecursiveDepth to 2:
```
200 + 20*200 + 20^2*200 = 84200 Kb = 82.22 Mb
200 + 20*200 + 20^2*200 = 84200 ms = 84.2 s
```
huge difference with previous examples

To avoid freezes and out of memory errors - consider using small maxRecursiveDepth (up to 3) and urlFilter
