var should = require('should');
var sinon = require('sinon');
var FilenameGenerator = require('../../../lib/filename-generator/index');
var byTypeFilenameGenerator = require('../../../lib/filename-generator/by-type');
var bySiteStructureFilenameGenerator = require('../../../lib/filename-generator/by-site-structure');
var Resource = require('../../../lib/resource');

describe('FilenameGenerator', function () {
	describe('constructor', function() {
		it('should clone options', function() {
			var options = { a: 1, b: 2 };
			var filenameGenerator = new FilenameGenerator(options);
			filenameGenerator.options.should.deepEqual(options);
			filenameGenerator.options.should.not.be.equal(options);
		});

		it('should initialize empty occupiedFilenames list', function () {
			var filenameGenerator = new FilenameGenerator({});
			filenameGenerator.occupiedFileNames.should.be.instanceOf(Array).and.have.length(0);
		});

		it('should set builtIn filename generation strategy if filenameGenerator is byType', function() {
			var filenameGenerator = new FilenameGenerator({ filenameGenerator: 'byType' });
			filenameGenerator.executeCurrentStrategy.should.be.equal(byTypeFilenameGenerator);
		});

		it('should set builtIn filename generation strategy if filenameGenerator is bySiteStructure', function() {
			var filenameGenerator = new FilenameGenerator({ filenameGenerator: 'bySiteStructure' });
			filenameGenerator.executeCurrentStrategy.should.be.equal(bySiteStructureFilenameGenerator);
		});

		it('should set passed function as generation strategy if filenameGenerator is function', function() {
			var generator = sinon.stub();
			var filenameGenerator = new FilenameGenerator({ filenameGenerator: generator });
			filenameGenerator.executeCurrentStrategy.should.be.equal(generator);
		});
	});

	describe('#addOccupiedFileName', function () {
		it('should add filename to occupiedFilenames', function() {
			var filenameGenerator = new FilenameGenerator({});
			filenameGenerator.occupiedFileNames.should.be.instanceOf(Array).and.have.length(0);

			filenameGenerator.addOccupiedFileName('one');
			filenameGenerator.occupiedFileNames.should.be.instanceOf(Array).and.have.length(1);
			filenameGenerator.occupiedFileNames[0].should.be.eql('one');

			filenameGenerator.addOccupiedFileName('two');
			filenameGenerator.occupiedFileNames.should.be.instanceOf(Array).and.have.length(2);
			filenameGenerator.occupiedFileNames[1].should.be.eql('two');
		});
	});

	describe('#generateFilename', function() {
		it('should execute current strategy with correct params', function() {
			var generatorStrategyStub = sinon.stub();
			var filenameGenerator = new FilenameGenerator({});
			filenameGenerator.executeCurrentStrategy = generatorStrategyStub;

			var resource = new Resource('http://example.com');
			filenameGenerator.generateFilename(resource);

			generatorStrategyStub.calledOnce.should.be.eql(true);
			generatorStrategyStub.calledWith(resource, filenameGenerator.options, filenameGenerator.occupiedFileNames).should.be.eql(true);
		});

		it('should add generated filename to occupied filenames', function() {
			var generatorStrategyStub = sinon.stub().returns('some-filename.txt');
			var filenameGenerator = new FilenameGenerator({});
			filenameGenerator.executeCurrentStrategy = generatorStrategyStub;
			var addOccupiedFilenameSpy = sinon.spy(filenameGenerator, 'addOccupiedFileName');

			var resource = new Resource('http://example.com');
			filenameGenerator.generateFilename(resource);

			addOccupiedFilenameSpy.calledOnce.should.be.eql(true);
			addOccupiedFilenameSpy.calledWith('some-filename.txt').should.be.eql(true);
		});
	});
});
