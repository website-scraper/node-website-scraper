import should from 'should';
import '../../utils/assertions.js';

import sinon from 'sinon';
import Resource from '../../../lib/resource.js';
import byTypeFilenameGenerator from '../../../lib/filename-generator/by-type.js';

describe('FilenameGenerator: byType', () => {
	it('should return resource filename', () => {
		const r = new Resource('http://example.com/a.png', 'b.png');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('b.png');
	});

	it('should return url-based filename if resource has no filename', () => {
		const r = new Resource('http://example.com/a.png');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('a.png');
	});

	it('should return url-based filename if resource has empty filename', () => {
		const r = new Resource('http://example.com/a.png', '');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('a.png');
	});

	it('should add missed extensions for html resources', () => {
		const r = new Resource('http://example.com/about', '');
		r.getType = sinon.stub().returns('html');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('about.html');
	});

	it('should add missed extensions for css resources', () => {
		const r = new Resource('http://example.com/css', '');
		r.getType = sinon.stub().returns('css');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('css.css');
	});

	it('should add missed extensions for js resources', () => {
		const r = new Resource('http://example.com/js', '');
		r.getType = sinon.stub().returns('js');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('js.js');
	});

	it('should not add missed extensions for other resources', () => {
		const r = new Resource('http://1.gravatar.com/avatar/4d63e4a045c7ff22accc33dc08442f86?s=140&amp;d=%2Fwp-content%2Fuploads%2F2015%2F05%2FGood-JOb-150x150.jpg&amp;r=g', '');
		r.getType = sinon.stub().returns('home');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('4d63e4a045c7ff22accc33dc08442f86');
	});

	it('should return filename with correct subdirectory', () => {
		const options = {
			subdirectories: [
				{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] }
			]
		};

		const r = new Resource('http://example.com/a.png');
		const filename = byTypeFilenameGenerator(r, options, []);
		filename.should.equalFileSystemPath('img/a.png');
	});

	it('should return filename with correct subdirectory when string cases are different', () => {
		const options = {
			subdirectories: [
				{ directory: 'img', extensions: ['.png'] }
			]
		};

		const r = new Resource('http://example.com/a.PNG');
		const f = byTypeFilenameGenerator(r, options, []);
		f.should.equalFileSystemPath('img/a.PNG');
	});

	it('should return different filename if desired filename is occupied', () => {
		const r = new Resource('http://second-example.com/a.png');
		const filename = byTypeFilenameGenerator(r, {}, [ 'a.png' ]);
		filename.should.not.equalFileSystemPath('a.png');
	});

	it('should return different filename if desired filename is occupied N times', () => {
		const occupiedFilenames = [];
		const r1 = new Resource('http://first-example.com/a.png');
		const r2 = new Resource('http://second-example.com/a.png');
		const r3 = new Resource('http://third-example.com/a.png');
		const r4 = new Resource('http://fourth-example.com/a.png');

		const f1 = byTypeFilenameGenerator(r1, {}, occupiedFilenames);
		f1.should.equalFileSystemPath('a.png');
		occupiedFilenames.push(f1);

		const f2 = byTypeFilenameGenerator(r2, {}, occupiedFilenames);
		f2.should.not.equal(f1);
		occupiedFilenames.push(f2);

		const f3 = byTypeFilenameGenerator(r3, {}, occupiedFilenames);
		f3.should.not.equal(f1);
		f3.should.not.equal(f2);
		occupiedFilenames.push(f3);

		const f4 = byTypeFilenameGenerator(r4, {}, occupiedFilenames);
		f4.should.not.equal(f1);
		f4.should.not.equal(f2);
		f4.should.not.equal(f3);
	});

	it('should shorten filename', () => {
		const resourceFilename = new Array(1000).fill('a').join('') + '.png';
		const r = new Resource('http://example.com/a.png', resourceFilename);
		const filename = byTypeFilenameGenerator(r, {}, []);
		should(filename.length).be.lessThan(255);
	});

	it('should return different short filename if first short filename is occupied', () => {
		const resourceFilename = new Array(1000).fill('a').join('') + '.png';

		const r1 = new Resource('http://first-example.com/a.png', resourceFilename);
		const r2 = new Resource('http://second-example.com/a.png', resourceFilename);

		const f1 = byTypeFilenameGenerator(r1, {}, []);
		should(f1.length).be.lessThan(255);

		const f2 = byTypeFilenameGenerator(r2, {}, [ f1 ]);
		should(f2.length).be.lessThan(255);
		should(f2).not.be.eql(f1);

		should(f2).not.be.eql(f1);
	});

	it('should return decoded url-based filename', () => {
		const r = new Resource('https://developer.mozilla.org/ru/docs/JavaScript_%D1%88%D0%B5%D0%BB%D0%BB%D1%8B');
		const filename = byTypeFilenameGenerator(r, {}, []);
		filename.should.equalFileSystemPath('JavaScript_шеллы');

		const r2 = new Resource('https://developer.mozilla.org/Hello%20G%C3%BCnter.png');
		const filename2 = byTypeFilenameGenerator(r2, {}, []);
		filename2.should.equalFileSystemPath('Hello Günter.png');
	});

	it('should remove not allowed characters from filename', () => {
		const r1 = new Resource('http://example.com/some/path/<*a*>.png');
		byTypeFilenameGenerator(r1, {}, []).should.equalFileSystemPath('__a__.png');
	});
});
