require('should');
var byTypeFilenameGenerator = require('../../../lib/filename-generators/by-type');
var bySiteStructureFilenameGenerator = require('../../../lib/filename-generators/by-site-structure');
var getFileNameGenerator = require('../../../lib/filename-generators/filename-generator-getter');

describe('FilenameGeneratorGetter', function () {
	it('should return the matching fileNameGenerator if the name of a fileGenerator is passed', function(){
		getFileNameGenerator('byType').should.equal(byTypeFilenameGenerator);
		getFileNameGenerator('bySiteStructure').should.equal(bySiteStructureFilenameGenerator);
	});
	
	it('should return the fileNameGenerator function which was passed', function(){
		var generator = function(){ };
		getFileNameGenerator(generator).should.equal(generator);
	});
});
