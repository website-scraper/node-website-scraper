var should = require('should');
var NormalizedUrlMap = require('../../../lib/utils/normalized-url-map');

describe('NormalizedUrlMap', function () {
	describe('#get', function() {
		it('should find nothing if no value with same url was set',function() {
			var map = new NormalizedUrlMap();
			should(map.get('http://first-resource.com')).be.eql(undefined);
		});

		it('should return value with same url', function() {
			var map = new NormalizedUrlMap();
			var a = { test: 'hello' };
			map.set('http://first-resource.com', a);

			should(map.get('http://first-resource.com')).be.eql(a);
			should(map.get('http://first-resource.com/')).be.eql(a);
			should(map.get('http://first-resource.com?')).be.eql(a);


			var b = { foo: 'bar' };
			map.set('http://example.com?a=1&b=2&c=3', b);

			should(map.get('http://example.com/?a=1&c=3&b=2')).be.eql(b);
			should(map.get('http://example.com/?c=3&b=2&a=1&')).be.eql(b);
			should(map.get('http://example.com/?c=3&a=1&b=2')).be.eql(b);
			should(map.get('http://example.com/?b=2&a=1&c=3')).be.eql(b);
		});
	});
});
