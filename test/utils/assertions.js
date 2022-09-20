import path from 'path';
import should from 'should';
should.Assertion.add('equalFileSystemPath', function (value, description) {
	value = path.normalize(value);
	if (process.platform == 'win32' && value.startsWith(path.sep)) {
		value = __dirname.split(path.sep)[0] + value;
	}
	this.params = { operator: 'to be', expected: value, message: description};
	this.obj.should.equal(value, description);
});
