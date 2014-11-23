var utils = require('../lib/utils/utils');
var should = require('should')
  describe('Common utils', function(){
    describe('#isUrl()', function(){
      it('should return true if url starts with "http[s]://"', function(){
        utils.isUrl('http://google.com').should.be.true;
        utils.isUrl('http://google.com').should.be.true;
      })
      it('should return true if url starts with "//"', function(){
        utils.isUrl('//www.youtube.com').should.be.true;
      })
      it('should return false if url starts neither with "http[s]://" nor "//"', function(){
        utils.isUrl('http//www.youtube.com').should.be.false;
        utils.isUrl('http:/www.youtube.com').should.be.false;
        utils.isUrl('htt://www.youtube.com').should.be.false;
        utils.isUrl('://www.youtube.com').should.be.false;
        utils.isUrl('www.youtube.com').should.be.false;
      })
    })
  });
