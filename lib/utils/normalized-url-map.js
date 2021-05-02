import { normalizeUrl } from './index.js';

class NormalizedUrlMap extends Map {
	get (key) {
		return super.get(normalizeUrl(key));
	}

	set (key, value) {
		return super.set(normalizeUrl(key), value);
	}

	has (key) {
		return super.has(normalizeUrl(key));
	}
}

export default NormalizedUrlMap;
