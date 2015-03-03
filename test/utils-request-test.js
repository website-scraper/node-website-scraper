var request = require('../lib/utils/request');

var should = require('should')
describe('Request utils', function(){
  describe('#getDefaultOptions', function(){
    it('should return object', function(){
      request.getDefaultOptions().should.be.instanceof(Object);
    });
  });

  describe('#getCustomOptions', function(){
    it('should return object', function(){
      request.getCustomOptions().should.be.instanceof(Object);
    });

    it('should return object with all properties of argument object if argument object is set', function(){
      var opts = { a: 1, b: 2 };
      request.getCustomOptions(opts).should.have.properties(opts);
    });

    it('should return default options if argument object is not set', function(){
      var defaultOpts = request.getDefaultOptions();
      request.getCustomOptions().should.be.eql(defaultOpts);
    });
  });

  describe('#makeRequest', function(){
    this.timeout(15000);

    it('should return object with url and body properties', function(){
      return request.makeRequest({}, 'http://example.com').then(function (data) {
        data.should.have.properties(['url', 'body']);
      });
    });
  });
});
