import * as chai from 'chai';
chai.should();
const should = chai.should();
import NormalizedUrlMap from '../../../lib/utils/normalized-url-map.js';

describe('NormalizedUrlMap', function () {
	describe('#get', function() {
		it('should find nothing if no value with same url was set', function () {
			const map = new NormalizedUrlMap();
			should.not.exist(map.get('http://first-resource.com'));
		});

		it('should return value with same url', function () {
			const map = new NormalizedUrlMap();
			const a = { test: 'hello' };
			map.set('http://first-resource.com', a);

			map.get('http://first-resource.com').should.eql(a);
			map.get('http://first-resource.com/').should.eql(a);
			map.get('http://first-resource.com?').should.eql(a);

			const b = { foo: 'bar' };
			map.set('http://example.com?a=1&b=2&c=3', b);

			map.get('http://example.com/?a=1&c=3&b=2').should.eql(b);
			map.get('http://example.com/?c=3&b=2&a=1&').should.eql(b);
			map.get('http://example.com/?c=3&a=1&b=2').should.eql(b);
			map.get('http://example.com/?b=2&a=1&c=3').should.eql(b);
		});
	});
});
