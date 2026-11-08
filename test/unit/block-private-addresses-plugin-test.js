import * as chai from 'chai';
chai.should();

import sinon from 'sinon';
import Scraper from '../../lib/scraper.js';
import Resource from '../../lib/resource.js';
import BlockPrivateAddressesPlugin, { isBlockedAddress } from '../../lib/plugins/block-private-addresses-plugin.js';

describe('BlockPrivateAddressesPlugin', () => {
	let scraper;

	beforeEach(() => {
		scraper = new Scraper({
			urls: ['http://example.com'],
			directory: './test/unit/.tmp',
			plugins: [ new BlockPrivateAddressesPlugin() ]
		});
	});

	const runBeforeRequest = (url, requestOptions = {}) => {
		return scraper.runActions('beforeRequest', { resource: new Resource(url), requestOptions });
	};

	const rejectionOf = async (promise) => {
		try {
			await promise;
		} catch (err) {
			return err;
		}
		throw new Error('expected promise to be rejected');
	};

	describe('isBlockedAddress', () => {
		const blocked = [
			'0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '127.255.255.254', '169.254.169.254',
			'172.16.0.1', '172.31.255.255', '192.0.0.1', '192.168.1.1', '198.18.0.1', '224.0.0.1', '255.255.255.255',
			'::', '::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '64:ff9b::a00:1', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1'
		];
		const allowed = [ '8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:2800:220:1:248:1893:25c8:1946', '::ffff:8.8.8.8' ];

		blocked.forEach((address) => {
			it(`should block ${address}`, () => isBlockedAddress(address).should.be.eql(true));
		});
		allowed.forEach((address) => {
			it(`should allow ${address}`, () => isBlockedAddress(address).should.be.eql(false));
		});
		it('should not block hostnames', () => isBlockedAddress('example.com').should.be.eql(false));
	});

	describe('beforeRequest', () => {
		it('should throw for a url with a blocked ip literal', async () => {
			for (const url of ['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]:8080/', 'http://[::ffff:127.0.0.1]/', 'http://0x7f000001/', 'http://2130706433/']) {
				const err = await rejectionOf(runBeforeRequest(url));
				err.message.should.match(/Blocked request to private address/, url);
			}
		});

		it('should pass a url with a public ip literal or a hostname', async () => {
			(await runBeforeRequest('http://8.8.8.8/')).requestOptions.should.be.an('object');
			(await runBeforeRequest('http://example.com/')).requestOptions.should.be.an('object');
		});

		it('should keep existing request options and add dnsLookup and a beforeRedirect hook', async () => {
			const existingHook = () => {};
			const { requestOptions } = await runBeforeRequest('http://example.com/', {
				headers: { 'user-agent': 'test' },
				hooks: { beforeRedirect: [existingHook], beforeRequest: [existingHook] }
			});

			requestOptions.headers.should.be.eql({ 'user-agent': 'test' });
			requestOptions.dnsLookup.should.be.instanceOf(Function);
			requestOptions.hooks.beforeRequest.should.be.eql([existingHook]);
			requestOptions.hooks.beforeRedirect.length.should.be.eql(2);
			requestOptions.hooks.beforeRedirect[0].should.be.eql(existingHook);
		});

		describe('beforeRedirect hook', () => {
			it('should throw for a redirect to a blocked ip literal', async () => {
				const { requestOptions } = await runBeforeRequest('http://example.com/');
				const hook = requestOptions.hooks.beforeRedirect[0];

				(() => hook({ url: new URL('http://127.0.0.1:6379/') })).should.throw(/Blocked request to private address 127.0.0.1/);
				(() => hook({ url: new URL('http://example.com/moved') })).should.not.throw();
			});
		});

		describe('dnsLookup', () => {
			const lookupWith = async (result, { base = null, requestOptions = {} } = {}) => {
				const lookup = base || sinon.stub().callsFake((hostname, options, callback) => callback(null, ...result));
				const { requestOptions: ro } = await runBeforeRequest('http://example.com/', { ...requestOptions, dnsLookup: lookup });
				return new Promise((resolve) => ro.dnsLookup('example.com', { all: true }, (err, address, family) => resolve({ err, address, family, lookup })));
			};

			it('should fail when the hostname resolves to a blocked address', async () => {
				const { err } = await lookupWith(['127.0.0.1', 4]);
				err.message.should.match(/Blocked request to example.com: it resolves to private address 127.0.0.1/);
			});

			it('should fail when any of the resolved addresses is blocked', async () => {
				const { err } = await lookupWith([[{ address: '8.8.8.8', family: 4 }, { address: '::1', family: 6 }]]);
				err.message.should.match(/private address ::1/);
			});

			it('should pass through public addresses', async () => {
				const addresses = [{ address: '8.8.8.8', family: 4 }, { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }];
				const { err, address, lookup } = await lookupWith([addresses]);
				(err === null).should.be.true;
				address.should.be.eql(addresses);
				lookup.calledOnceWith('example.com', { all: true }).should.be.true;
			});

			it('should pass through lookup errors', async () => {
				const dnsError = new Error('ENOTFOUND');
				const base = (hostname, options, callback) => callback(dnsError);
				const { err } = await lookupWith(null, { base });
				err.should.be.eql(dnsError);
			});

			it('should use dnsCache.lookup when no dnsLookup is set', async () => {
				const dnsCache = { lookup: sinon.stub().callsFake((hostname, options, callback) => callback(null, [{ address: '10.0.0.1', family: 4 }])) };
				const { requestOptions } = await runBeforeRequest('http://example.com/', { dnsCache });
				const err = await new Promise((resolve) => requestOptions.dnsLookup('example.com', { all: true }, resolve));

				dnsCache.lookup.calledOnce.should.be.true;
				err.message.should.match(/private address 10.0.0.1/);
			});
		});
	});
});
