import dns from 'dns';
import net from 'net';
import { extend } from '../utils/index.js';

/*
 * Addresses which are not globally reachable (RFC 6890 / IANA special-purpose registries):
 * loopback, link-local (incl. cloud metadata endpoints), private, CGNAT, multicast, reserved,
 * documentation and benchmarking ranges. IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are checked
 * against the IPv4 ranges by net.BlockList.
 */
const blockedIpv4 = [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.0.2.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['198.51.100.0', 24],
	['203.0.113.0', 24],
	['224.0.0.0', 4],
	['240.0.0.0', 4]
];
const blockedIpv6 = [
	['::', 128],
	['::1', 128],
	['64:ff9b::', 96],
	['100::', 64],
	['2001:db8::', 32],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8]
];

const blockList = new net.BlockList();
blockedIpv4.forEach(([address, prefix]) => blockList.addSubnet(address, prefix, 'ipv4'));
blockedIpv6.forEach(([address, prefix]) => blockList.addSubnet(address, prefix, 'ipv6'));

function isBlockedAddress (address) {
	const family = net.isIP(address);
	if (family === 0) {
		return false; // hostname - the addresses it resolves to are checked in dnsLookup
	}
	return blockList.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

// Throws if the url points to a blocked ip literal. Hostnames are checked after dns resolution.
function assertAllowedUrl (url) {
	const hostname = new URL(url).hostname.replace(/^\[(.*)]$/, '$1'); // [::1] -> ::1
	if (isBlockedAddress(hostname)) {
		throw new Error(`Blocked request to private address ${hostname} (${url})`);
	}
}

// Wraps a dns lookup function so that resolving to any blocked address fails the lookup.
// Node skips the lookup for ip literals, those are checked by assertAllowedUrl.
function guardedLookup (lookup) {
	return (hostname, options, callback) => {
		lookup(hostname, options, (err, address, family) => {
			if (err) {
				callback(err);
				return;
			}
			// with { all: true } address is an array of { address, family }
			const addresses = Array.isArray(address) ? address.map((a) => a.address) : [address];
			const blocked = addresses.find(isBlockedAddress);
			if (blocked) {
				callback(new Error(`Blocked request to ${hostname}: it resolves to private address ${blocked}`));
				return;
			}
			callback(null, address, family);
		});
	};
}

function getBaseLookup (requestOptions) {
	if (requestOptions.dnsLookup) {
		return requestOptions.dnsLookup;
	}
	const { dnsCache } = requestOptions;
	if (dnsCache && typeof dnsCache.lookup === 'function') {
		return dnsCache.lookup.bind(dnsCache);
	}
	return dns.lookup;
}

/*
 * Rejects requests to loopback, link-local, private and other non-public addresses: the url of
 * every requested resource, every redirect target and every address a hostname resolves to.
 * Opt-in, for applications which scrape urls supplied by untrusted users. See README.
 */
class BlockPrivateAddressesPlugin {
	apply (registerAction) {
		registerAction('beforeRequest', ({ resource, requestOptions }) => {
			assertAllowedUrl(resource.getUrl());

			const hooks = requestOptions.hooks || {};
			const beforeRedirect = [
				...(hooks.beforeRedirect || []),
				(options) => assertAllowedUrl(options.url.href)
			];

			return {
				requestOptions: extend(requestOptions, {
					dnsLookup: guardedLookup(getBaseLookup(requestOptions)),
					hooks: extend(hooks, { beforeRedirect })
				})
			};
		});
	}
}

export default BlockPrivateAddressesPlugin;
export { isBlockedAddress };
