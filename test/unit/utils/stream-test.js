import * as chai from 'chai';
import { Readable } from 'stream';
import { readAll } from '../../../lib/utils/stream.js';
chai.should();

describe('utils/stream', function () {
	describe('#readAll', function () {
		it('should read whole stream to string with given encoding', async function () {
			const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);
			const text = await readAll(stream, 'utf8');
			text.should.be.eql('hello world');
		});

		it('should keep bytes intact with binary encoding', async function () {
			const bytes = Buffer.from([0xff, 0x00, 0xab, 0x10]);
			const text = await readAll(Readable.from(bytes), 'binary');
			Buffer.from(text, 'binary').should.be.eql(bytes);
		});

		it('should reject when stream emits error', async function () {
			const stream = new Readable({
				read () {
					this.destroy(new Error('read error'));
				}
			});
			try {
				await readAll(stream, 'utf8');
				throw new Error('expected readAll to reject');
			} catch (err) {
				err.message.should.be.eql('read error');
			}
		});
	});
});
