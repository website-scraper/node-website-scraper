# Migration Guide

## From version 6 to 7

Version 7 stops storing resource content in memory ([#386](https://github.com/website-scraper/node-website-scraper/issues/386)). Resources which need no modification (images, fonts, media, scripts - everything except html and css) are streamed directly from the network to storage, and html/css content is freed as soon as the resource is saved. Memory usage no longer grows with the size of the scraped website.

#### saveResource action

Resource content is now exposed as a Readable stream via `resource.getContentStream()` instead of `resource.getText()`. For streamed resources the stream can be consumed only once - consume or destroy it within the action.

```javascript
// before
registerAction('saveResource', async ({resource}) => {
  await saveItSomewhere(resource.getFilename(), resource.getText());
});

// after
import { buffer } from 'stream/consumers';
registerAction('saveResource', async ({resource}) => {
  await saveItSomewhere(resource.getFilename(), await buffer(resource.getContentStream()));
});
// or pipe resource.getContentStream() to your storage to avoid buffering
```

#### afterResponse action

The action is called when response headers arrive, before the body is downloaded. It receives `{response}` where response is `{url, statusCode, headers, getBody()}` instead of the full got response. Returning a string is not supported anymore - return an object or null. Return an object without `body` to keep the resource streaming (no buffering).

```javascript
// before
registerAction('afterResponse', ({response}) => {
  if (response.statusCode === 404) return null;
  return { body: response.body, metadata: { headers: response.headers } };
});

// after
registerAction('afterResponse', ({response}) => {
  if (response.statusCode === 404) return null;
  return { metadata: { headers: response.headers } };
});
// call `await response.getBody()` only if you need to inspect or replace the body
```

#### scrape() result

Resource content is not retained after save: `resource.getText()` returns `null` in the result and in `onResourceSaved`. Read saved files from your storage instead.

#### generateFilename action

`responseData` no longer contains `body` - filenames are generated from headers (`url`, `statusCode`, `mimeType`, `encoding`, `metadata`) before the body is consumed.

#### Other behavior changes

* Binary files are written byte-for-byte from the network (previously the content was round-tripped through a latin1 string). Output for correctly-served files is unchanged; edge-case encodings may differ.
* Transient request errors are retried as before, but only until response headers are received. A connection which dies mid-body is not retried.
* `responseType` in the `request` option is ignored (responses are streamed).

## From version 4 to 5

#### ESM module

Module is now pure ESM and cannot be `require`d from CommonJS module. [Read about ESM modules and how to migrate from CommonJS to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)

#### options.request
If you're using [request object](https://github.com/website-scraper/node-website-scraper#request) to customize headers, query params, encoding, etc. - it may require some changes (howewer most of options remain the same). Please follow this [migration guide to got](https://github.com/sindresorhus/got/blob/main/documentation/migration-guides.md).

#### defaults
If you're using `scrape.defaults` now you need to receive them with
```javascript
import defaultOptions from 'website-scraper/defaultOptions';
``` 

#### built-in plugins
If you're using `scrape.plugins` now you need to receive them with
```javascript
import * as plugins from 'website-scraper/plugins';
``` 

## From version 3 to 4

#### resourceSaver option

Create plugin class which adds `saveResource` action
```javascript
// before
scrape({
  resourceSaver: class MyResourceSaver {
  	saveResource (resource) {/* code to save file where you need */}
  	errorCleanup (err) {/* code to remove all previously saved files in case of error */}
  }
})

// after
class CustomSaveResourcePlugin {
  apply(registerAction) {
    registerAction('saveResource', ({resource}) => {/* code to save file where you need */})
  }
}
scrape({
  plugins: [ new CustomSaveResourcePlugin() ]
})
```

#### updateSources option

Create plugin class which adds `getReference` action
```javascript
// before
scrape({
  updateSources: false
})

// after
class MyGetReferencePlugin {
  apply(registerAction) {
    registerAction('getReference', () => ({ reference: null }))
  }
}
scrape({
  plugins: [ new MyGetReferencePlugin() ]
})
```

#### updateMissingSources option

Create plugin class which adds `getReference` action
```javascript
// before
scrape({
  updateMissingSources: true
})

// after
class MyGetReferencePlugin {
  apply(registerAction) {
    registerAction('getReference', ({resource, parentResource, originalReference}) => {
      if (!resource) {
        return { reference: getAbsoluteUrl(parentResource, originalReference) }
      }
      return getRelativePath(parentResource.getFilename(), resource.getFilename());
    })
  }
}
scrape({
  plugins: [ new MyGetReferencePlugin() ]
})
```

#### filenameGenerator option 

For functions only, if you use string `byType` or `byStructure` - you don't need to do anything.

Create plugin class which adds `generateFilename` action
```javascript
// before
scrape({
  filenameGenerator: (resource, options, occupiedFileNames) => {
    return crypto.randomBytes(20).toString('hex'); 
  }
})

// after
class MyGenerateFilenamePlugin {
  apply(registerAction) {
    registerAction('generateFilename', ({resource}) => {
      return {filename: crypto.randomBytes(20).toString('hex')};
    });
  }
}
scrape({
  plugins: [ new MyGenerateFilenamePlugin() ]
})
```

#### httpResponseHandler option

Create plugin class which adds `afterResponse` action
```javascript
// before
scrape({
  httpResponseHandler: (response) => {
  	if (response.statusCode === 404) {
		return Promise.reject(new Error('status is 404'));
	} else {
		return Promise.resolve(response.body);
  	}
  }
})

// after
class MyAfterResponsePlugin {
  apply(registerAction) {
    registerAction('afterResponse', ({response}) => {
    if (response.statusCode === 404) {
        return null;
      } else {
        return response.body;
      }
    });
  }
}
scrape({
  plugins: [ new MyAfterResponsePlugin() ]
})
```

#### request option
For functions only, if you use static request object - you don't need to do anything.

Create plugin class which adds `beforeRequest` action
```javascript
// before
scrape({
  request: resource => ({qs: {myParam: 123}})
})

// after
class MyBeforeRequestPlugin {
  apply(registerAction) {
    registerAction('beforeRequest', ({resource, requestOptions}) => {
      return {requestOptions: {qs: {myParam: 123}}};
    });
  }
}
scrape({
  plugins: [ new MyBeforeRequestPlugin() ]
})
```

#### onResourceSaved and onResourceError options

Create plugin class which adds `onResourceSaved` and `onResourceError` actions
```javascript
// before
scrape({
  onResourceSaved: (resource) => {
  	console.log(`Resource ${resource} was saved to fs`);
  },
  onResourceError: (resource, err) => {
  	console.log(`Resource ${resource} was not saved because of ${err}`);
  }
})

// after
class MyPlugin {
  apply(registerAction) {
    registerAction('onResourceSaved', ({resource}) => console.log(`Resource ${resource.url} saved!`));
    registerAction('onResourceError', ({resource, error}) => console.log(`Resource ${resource.url} has error ${error}`));
  }
}
scrape({
  plugins: [ new MyPlugin() ]
})
```
