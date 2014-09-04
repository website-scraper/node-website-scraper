var Url = require('url'),
  Iconv = require('iconv').Iconv,
  cheerio = require('cheerio');

/**
* Find charset definition in meta tag and return latest
* @param {Buffer} buffer to find in
* @return {string} latest found charset in <meta>
*/
function getCharsetFromMetaTag(buffer){
  var string = buffer.toString(),
    $ = cheerio.load(string),
    charset = 'utf-8';

  $('meta[charset]').filter(function(){
    charset = $(this).attr('charset').toLowerCase();
  });

  $('meta[content*=charset]').filter(function(){
    var content = $(this).attr('content').toLowerCase(),
      charsetRegexp = /charset=(.*?)(;.+|$)/;
    charset = content.match(charsetRegexp)[1];
  });

  return charset;
}

function toUtf8(buffer){
  var charset = getCharsetFromMetaTag(buffer);
  try {
    return buffer.toString(charset);
  } catch (x) {
    var charsetConverter = new Iconv(charset, 'utf8');
    return charsetConverter.convert(buffer).toString();
  }
}

function trimUrl(url){
  var questionMarkIndex = url.indexOf('?');
  if(questionMarkIndex > 0){
    url = url.substring(0, questionMarkIndex);
  }
  return url;
}

function trimFilename(filename){
  var questionMarkIndex = filename.indexOf('?'),
    hashIndex = filename.indexOf('#'),
    indexToCut = filename.length;

  if(questionMarkIndex > 0 && hashIndex > 0) {
    indexToCut = questionMarkIndex < hashIndex ? questionMarkIndex : hashIndex
  } else if(questionMarkIndex > 0) {
    indexToCut = questionMarkIndex;
  } else if(hashIndex > 0) {
    indexToCut = hashIndex;
  }

  return filename.substring(0, indexToCut);
}

function isPathAbsolute(path){
  var absolutePathRegexp = /^http:\/|^https:\/|^\/\//;
  return absolutePathRegexp.test(path);
}

function getAbsolutePath(curPath, link){
  if(isPathAbsolute(link)){
    var absolutePathNoProtocolRegexp = /^\/\//;
    if(absolutePathNoProtocolRegexp.test(link)){
      link = 'http:' + link;
    }
    return link;
  } else {
    return Url.resolve(curPath, link);     
  }
}

function pathToUnixFormat(filepath) {
  return filepath.replace(/\\/g, '/');
}

// Check if path contains base64 encoded image
function isEmbeddedImage(path){
  var embeddedImageRegexp = /data:image\//;
  return embeddedImageRegexp.test(path);
}

function Utils(){}

Utils.prototype.toUtf8 = toUtf8;
Utils.prototype.getAbsolutePath = getAbsolutePath;
Utils.prototype.pathToUnixFormat = pathToUnixFormat;
Utils.prototype.isEmbeddedImage = isEmbeddedImage;
Utils.prototype.trimUrl = trimUrl;
Utils.prototype.trimFilename = trimFilename;

module.exports = Utils;
