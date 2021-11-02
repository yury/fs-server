import * as assert from 'assert';
import {WebSocket} from 'ws'
import 'mocha';
import Channel, {MessageType} from './channel'


suite('Channel', () => {

	test('Test cancel', () => {
		let channel = new Channel(null);
		let res = channel._writeCancel(3, 1, 2);

		let parsed = channel.parseMessage(res);
		assert.strictEqual(3, parsed.id);
		assert.strictEqual(MessageType.Cancel, parsed.type);
		if (parsed.type === MessageType.Cancel) {
			assert.strictEqual(2, parsed.cancelID);
		} else {
			assert.fail("invalid message type")
		}
	});

	test('Test json', () => {
		let channel = new Channel(null);
		let res = channel._writeJson(1, 2, {hello: 0})

		let parsed = channel.parseMessage(res);
		assert.strictEqual(1, parsed.id);
		assert.strictEqual(MessageType.Json, parsed.type);
		if (parsed.type === MessageType.Json) {
			assert.notStrictEqual({hello: 0}, parsed.body);
		} else {
			assert.fail("invalid message type")
		}
	});

	test('Test json with binary', () => {
		let channel = new Channel(null);
		let res = channel._writeJsonWithBinary(
			1, 3, {hello: 1}, Uint8Array.from( [1, 2])
		);

		let parsed = channel.parseMessage(res);
		assert.strictEqual(1, parsed.id);
		assert.strictEqual(MessageType.JsonWithBinary, parsed.type);
		if (parsed.type === MessageType.JsonWithBinary) {
			assert.notStrictEqual({hello: 1}, parsed.body);
			assert.notStrictEqual([1, 2], parsed.data);
		} else {
			assert.fail("invalid message type")
		}
	});

	test('Test binary', () => {
		let channel = new Channel(null);
		let res = channel._writeBinary(10, 4, Uint8Array.from([1, 2, 3]));
		let parsed = channel.parseMessage(res);
		assert.strictEqual(10, parsed.id);
		assert.strictEqual(MessageType.Binary, parsed.type);
		if (parsed.type === MessageType.Binary) {
			assert.notStrictEqual([1, 2, 3], parsed.data);
		} else {
			assert.fail("invalid message type")
		}
	});
});

