var _ = require('lodash');
var path = require('path');
var should = require('should');
should.Assertion.add('equalFileSystemPath', function(value, description){
    value = path.normalize(value);
    if(process.platform == 'win32' && _.startsWith(value, path.sep)){
        value = __dirname.split(path.sep)[0] + value;
    }
    this.params = { operator: 'to be', expected: value, message: description};
    this.obj.should.equal(value, description);
});