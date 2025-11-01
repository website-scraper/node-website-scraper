import should from 'should';
import '../../utils/assertions.js';

import sinon from 'sinon';
import Resource from '../../../lib/resource.js';
import byTypeFilenameGenerator from '../../../lib/filename-generator/by-type.js';

describe('FilenameGenerator: byType', () => {
	it('should return resource filename', () => {
		const r = new Resource('http://example.com/a.png', 'b.png');
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('b.png');
	});

	it('should return url-based filename if resource has no filename', () => {
		const r = new Resource('http://example.com/a.png');
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('a.png');
	});

	it('should return url-based filename if resource has empty filename', () => {
		const r = new Resource('http://example.com/a.png', '');
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('a.png');
	});

	it('should add missed extensions for html resources', () => {
		const r = new Resource('http://example.com/about', '');
		r.getType = sinon.stub().returns('html');
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('about.html');
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
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('js.js');
	});

	it('should not add missed extensions for other resources', () => {
		const r = new Resource('http://1.gravatar.com/avatar/4d63e4a045c7ff22accc33dc08442f86?s=140&amp;d=%2Fwp-content%2Fuploads%2F2015%2F05%2FGood-JOb-150x150.jpg&amp;r=g', '');
		r.getType = sinon.stub().returns('home');
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('4d63e4a045c7ff22accc33dc08442f86');
	});

	it('should return filename with correct subdirectory', () => {
		const options = {
			subdirectories: [
				{ directory: 'img', extensions: ['.jpg', '.png', '.svg'] }
			]
		};

		const r = new Resource('http://example.com/a.png');
		const filepath = byTypeFilenameGenerator(r, options, []);
		filepath.should.equalFileSystemPath('img/a.png');
	});

	it('should return filename with correct subdirectory when string cases are different', () => {
		const options = {
			subdirectories: [
				{ directory: 'img', extensions: ['.png'] }
			]
		};

		const r = new Resource('http://example.com/a.PNG');
		const filepath = byTypeFilenameGenerator(r, options, []);
		filepath.should.equalFileSystemPath('img/a.PNG');
	});

	it('should return different filename if desired filename is occupied', () => {
		const r = new Resource('http://second-example.com/a.png');
		const filepath = byTypeFilenameGenerator(r, {}, [ 'a.png' ]);
		filepath.should.not.equalFileSystemPath('a.png');
	});

	it('should return different filename if desired filename is occupied N times', () => {
		const occupiedFilenames = [];
		const r1 = new Resource('http://first-example.com/a.png');
		const r2 = new Resource('http://second-example.com/a.png');
		const r3 = new Resource('http://third-example.com/a.png');
		const r4 = new Resource('http://fourth-example.com/a.png');

		const fp1 = byTypeFilenameGenerator(r1, {}, occupiedFilenames);
		fp1.should.equalFileSystemPath('a.png');
		occupiedFilenames.push(fp1);

		const fp2 = byTypeFilenameGenerator(r2, {}, occupiedFilenames);
		fp2.should.not.equal(fp1);
		occupiedFilenames.push(fp2);

		const fp3 = byTypeFilenameGenerator(r3, {}, occupiedFilenames);
		fp3.should.not.equal(fp1);
		fp3.should.not.equal(fp2);
		occupiedFilenames.push(fp3);

		const fp4 = byTypeFilenameGenerator(r4, {}, occupiedFilenames);
		fp4.should.not.equal(fp1);
		fp4.should.not.equal(fp2);
		fp4.should.not.equal(fp3);
	});

	it('should shorten filename', () => {
		const resourceFilename = new Array(1000).fill('a').join('') + '.png';
		const r = new Resource('http://example.com/a.png', resourceFilename);
		const filepath = byTypeFilenameGenerator(r, {}, []);
		const filenameParts = filepath.split('/');
		const filename = filenameParts[filenameParts.length - 1];
		should(filename.length).be.lessThanOrEqual(255);
	});

	it('should return different short filename if first short filename is occupied', () => {
		const resourceFilename = new Array(1000).fill('a').join('') + '.png';

		const r1 = new Resource('http://first-example.com/a.png', resourceFilename);
		const r2 = new Resource('http://second-example.com/a.png', resourceFilename);

		const fp1 = byTypeFilenameGenerator(r1, {}, []);
		const filenameParts1 = fp1.split('/');
		const filename1 = filenameParts1[filenameParts1.length - 1];
		should(filename1.length).be.lessThanOrEqual(255);

		const fp2 = byTypeFilenameGenerator(r2, {}, [ fp1 ]);
		const filenameParts2 = fp2.split('/');
		const filename2 = filenameParts2[filenameParts2.length - 1];
		should(filename2.length).be.lessThanOrEqual(255);
		should(filename2).not.be.eql(filename1);
	});

	it('should return decoded url-based filename', () => {
		const r = new Resource('https://developer.mozilla.org/ru/docs/JavaScript_%D1%88%D0%B5%D0%BB%D0%BB%D1%8B');
		const filepath = byTypeFilenameGenerator(r, {}, []);
		filepath.should.equalFileSystemPath('JavaScript_шеллы');

		const r2 = new Resource('https://developer.mozilla.org/Hello%20G%C3%BCnter.png');
		const filepath2 = byTypeFilenameGenerator(r2, {}, []);
		filepath2.should.equalFileSystemPath('Hello Günter.png');
	});

	it('should remove not allowed characters from filename', () => {
		const r1 = new Resource('http://example.com/some/path/<*a*>.png');
		byTypeFilenameGenerator(r1, {}, []).should.equalFileSystemPath('_a_.png');
	});
});
