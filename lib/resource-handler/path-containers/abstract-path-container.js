
class AbstractPathContainer {
	constructor (text) {
		if (this.constructor === AbstractPathContainer) {
			throw new TypeError('Can not construct abstract class.');
		}
		if (this.updateText === AbstractPathContainer.prototype.updateText) {
			throw new TypeError('Method updateText is not implemented.');
		}

		this.text = text || '';
		this.paths = [];
	}

	getPaths () {
		return this.paths;
	}

	updateText () {
		throw new TypeError('Can\'t call abstract method updateText');
	}
}

module.exports = AbstractPathContainer;
