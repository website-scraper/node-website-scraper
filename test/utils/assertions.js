import path from 'path';
import * as chai from 'chai';
chai.should();
chai.Assertion.addMethod('equalFileSystemPath', function (value, description) {
    value = path.normalize(value);
    if (process.platform == 'win32' && value.startsWith(path.sep)) {
        value = __dirname.split(path.sep)[0] + value;
    }
    this.assert(
        path.normalize(this._obj) === value,
        description || `expected #{this} to equal file system path #{exp}`,
        description || `expected #{this} to not equal file system path #{exp}`,
        value,
        this._obj
    );
});
