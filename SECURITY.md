# Security

## Reporting a vulnerability

Please report security issues privately through
[GitHub security advisories](https://github.com/website-scraper/node-website-scraper/security/advisories/new).
Do not open a public issue for security reports.

## Security considerations

website-scraper is a general-purpose download tool. It requests the urls passed in `urls`
and, by default, every resource referenced by the downloaded content (images, scripts,
stylesheets, iframes, media, ...). Redirects are followed. The library does **not** check
whether a destination is a public, private, loopback or link-local address, because many
users legitimately mirror intranet, staging or localhost sites.

If your application scrapes urls supplied by untrusted users, treat both the supplied urls and
every url discovered in the downloaded content as untrusted. Without restrictions, a page you
are asked to download can make the scraper request internal services or cloud metadata
endpoints (server-side request forgery) and save their responses to disk.

### Hardening recipe

Use `urlFilter` to restrict discovered urls (it is also applied to the url a discovered
resource is redirected to), and a `beforeRequest` action to validate every request, including
the initial urls, redirect targets and the addresses hostnames resolve to.

```javascript
import scrape from 'website-scraper';
import dns from 'node:dns';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

function isPublicAddress (address) {
  const ip = ipaddr.process(address); // maps ::ffff:a.b.c.d to IPv4
  return ip.range() === 'unicast';
}

function isAllowedUrl (url) {
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'http:' && protocol !== 'https:') return false;
  if (net.isIP(hostname) && !isPublicAddress(hostname)) return false;
  return true;
}

class SsrfGuard {
  apply (registerAction) {
    registerAction('beforeRequest', async ({ resource, requestOptions }) => {
      if (!isAllowedUrl(resource.getUrl())) {
        throw new Error(`Blocked url ${resource.getUrl()}`);
      }
      return {
        requestOptions: {
          ...requestOptions,
          hooks: {
            ...requestOptions.hooks,
            // check every redirect target, the request fails if the hook throws
            beforeRedirect: [(options, response) => {
              if (!isAllowedUrl(options.url.href)) {
                throw new Error(`Blocked redirect to ${options.url.href}`);
              }
            }]
          },
          // check the addresses the hostname actually resolves to
          dnsLookup: (hostname, options, callback) => {
            dns.lookup(hostname, options, (err, address, family) => {
              if (err) return callback(err);
              // with { all: true } address is an array of { address, family }
              const addresses = Array.isArray(address) ? address.map((a) => a.address) : [address];
              const blocked = addresses.find((a) => !isPublicAddress(a));
              if (blocked) {
                return callback(new Error(`Blocked address ${blocked} for ${hostname}`));
              }
              callback(null, address, family);
            });
          }
        }
      };
    });
  }
}

await scrape({
  urls: ['https://example.com/'],
  directory: '/path/to/save',
  urlFilter: isAllowedUrl,
  ignoreErrors: true, // blocked resources are skipped instead of failing the whole scrape
  plugins: [new SsrfGuard()]
});
```

Adjust `isPublicAddress` and `isAllowedUrl` to your own policy, for example an allowlist of
hosts. The address validated in `dnsLookup` is the one the connection is made to, so the check
also covers hostnames which resolve to internal addresses.
