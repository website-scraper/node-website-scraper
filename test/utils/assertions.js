import _ from 'lodash';
import path from 'path';
import should from 'should';
import fs from 'fs/promises';

should.Assertion.add('equalFileSystemPath', function(value, description) {
	value = path.normalize(value);
	if (process.platform === 'win32' && _.startsWith(value, path.sep)) {
		value = __dirname.split(path.sep)[0] + value;
	}
	this.params = { operator: 'to be', expected: value, message: description};
	this.obj.should.equal(value, description);
});

should.Assertion.add('fileExists', async function(value, description) {
	let exists = false;

	try {
		exists = (await fs.stat(this.obj)).isFile();
	} catch (err) {
		// We don't care about this error.
	}

	if (value === undefined) {
		value = true;
	}

	exists.should.eql(value, description);
});

should.Assertion.add('dirExists', async function(value, description) {
	let exists = false;

	try {
		exists = (await fs.stat(this.obj)).isDirectory();
	} catch (err) {
		// We don't care about this error.
	}

	if (value === undefined) {
		value = true;
	}

	exists.should.eql(value, description);
});
