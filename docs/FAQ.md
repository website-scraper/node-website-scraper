# Frequently Asked Questions

### Q: website-scraper freezes/runs out of memory/does not download my website
If you have really large website - scraper tries to download too much pages and freezes. 

I'd suggest to:
* ensure that you're trying to download only what you need. To track what scraper is doing you can use `debug` [as described in readme](https://github.com/s0ph1e/node-website-scraper#log-and-debug)
* add [urlFilter](https://github.com/s0ph1e/node-website-scraper#urlfilter) and/or decrease [maxRecursiveDepth](https://github.com/s0ph1e/node-website-scraper#maxrecursivedepth) to limit dowloaded resources
* increase memory limit for node process `node --max-old-space-size=8192 app.js // to increase memory 8gb`

### Q: I'm getting Directory Exists error. Can I save website to existing directory?
By default trying to save to existing directory throws errors. 
It is expected behavior - new directory is required for each scrape to prevent modifications of existing files.
You can modify this behavior by using [website-scraper-existing-directory](https://github.com/website-scraper/website-scraper-existing-directory) plugin or create your own [plugin](https://github.com/website-scraper/node-website-scraper#plugins) with `saveResource` action. 

Keep in mind that saving to existing directory may overwrite your files. Be careful with it!

### Q: Why website with javascript is not downloaded correcly?
By default dynamic websites (where content is loaded by js) may be saved not correctly because `website-scraper` doesn't execute js, it only parses http responses for html and css files. 
If you need to download dynamic website take a look on [website-scraper-phantom](https://github.com/website-scraper/node-website-scraper-phantom). It can handle javascript but scraping will take much more time.

### Q: Can I download files to amazon S3/dropbox/database/other place?
Yes. To save resources where you need you can implement plugin with [saveResource](https://github.com/website-scraper/node-website-scraper#saveresource) action.

### Q: How can I keep resources under the same original path? Can I customize resource path?
If you want resources to have exactly same path as on original website - you can try [filenameGenerator](https://github.com/website-scraper/node-website-scraper#bysitestructure) option with value `'bySiteStructure'`.
If `byType`(default) and `bySiteStructure` filename generators are not suitable - you can implement your own [plugin](https://github.com/website-scraper/node-website-scraper#plugins) with `generateFilename` action

### Q: Why should I use maxDepth, maxRecursiveDepth and urlFilter?
