var css = require('../lib/utils/css');

var should = require('should')
  describe('Css utils', function(){
    describe('#isEmbedded(src)', function(){
      it('should return true if src is base64-encoded', function(){
        var base64_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAA \
        ABlBMVEUAAAD///+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeN               \
        Ge4Ug9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC';
        var base64_2 = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D';
        css.isEmbedded(base64_1).should.be.true;
        css.isEmbedded(base64_2).should.be.true;
      });
      it('should return false if src is not base64-encoded', function(){
        var path = 'images/px/arrow-090-small.png';
        var url = 'https://www.google.com.ua/images/srpr/logo11w.png';
        css.isEmbedded(path).should.be.false;
        css.isEmbedded(url).should.be.false;
      });
    });


  });
