var css = require('../lib/utils/css');

var should = require('should')
  describe('Css utils', function(){
    describe('#isEmbedded(src)', function(){
      it('should return true if src is base64-encoded', function(){
        var base64_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD///+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4Ug9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC';
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

    describe('#getSourcesPaths(text)', function(){
      it('should return array of entries from url(...), @import url(...) and @import ...', function(){
        var text = '\
          @import url("a.css");             \
          @import url(\'b.css\') tv;        \
          @import url(c.css);               \
          @import "d.css" screen;           \
          @import \'e.css\';                \
          @import f.css;                    \
          background-image url ("g.css");   \
          background-image url (\'h.css\'); \
          background-image url (i.css);     \
        ';

        var paths = css.getSourcesPaths(text);
        paths.should.be.instanceof(Array).and.have.lengthOf(9);
        paths.should.containEql('a.css');
        paths.should.containEql('b.css');
        paths.should.containEql('c.css');
        paths.should.containEql('d.css');
        paths.should.containEql('e.css');
        paths.should.containEql('f.css');
        paths.should.containEql('g.css');
        paths.should.containEql('h.css');
        paths.should.containEql('i.css');

      });

      it('should not return duplicate paths', function(){
        var text = '\
          @import url("a.css");             \
          @import a.css;                    \
          background-image url ("a.css");   \
        ';

        var paths = css.getSourcesPaths(text);
        paths.should.be.instanceof(Array).and.have.lengthOf(1);
        paths.should.containEql('a.css');
      });
    });
  });
