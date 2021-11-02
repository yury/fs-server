"use strict";
exports.__esModule = true;
var assert = require("assert");
require("mocha");
var channel_1 = require("./channel");
suite('Channel', function () {
    test('Test cancel', function () {
        var channel = new channel_1["default"](null);
        var res = channel._writeCancel(3, 1, 2);
        var parsed = channel.parseMessage(res);
        assert.strictEqual(3, parsed.id);
        assert.strictEqual(channel_1.MessageType.Cancel, parsed.type);
        if (parsed.type === channel_1.MessageType.Cancel) {
            assert.strictEqual(2, parsed.cancelID);
        }
        else {
            assert.fail("invalid message type");
        }
    });
    test('Test json', function () {
        var channel = new channel_1["default"](null);
        var res = channel._writeJson(1, 2, { hello: 0 });
        var parsed = channel.parseMessage(res);
        assert.strictEqual(1, parsed.id);
        assert.strictEqual(channel_1.MessageType.Json, parsed.type);
        if (parsed.type === channel_1.MessageType.Json) {
            assert.notStrictEqual({ hello: 0 }, parsed.body);
        }
        else {
            assert.fail("invalid message type");
        }
    });
    test('Test json with binary', function () {
        var channel = new channel_1["default"](null);
        var res = channel._writeJsonWithBinary(1, 3, { hello: 1 }, Uint8Array.from([1, 2]));
        var parsed = channel.parseMessage(res);
        assert.strictEqual(1, parsed.id);
        assert.strictEqual(channel_1.MessageType.JsonWithBinary, parsed.type);
        if (parsed.type === channel_1.MessageType.JsonWithBinary) {
            assert.notStrictEqual({ hello: 1 }, parsed.body);
            assert.notStrictEqual([1, 2], parsed.data);
        }
        else {
            assert.fail("invalid message type");
        }
    });
    test('Test binary', function () {
        var channel = new channel_1["default"](null);
        var res = channel._writeBinary(10, 4, Uint8Array.from([1, 2, 3]));
        var parsed = channel.parseMessage(res);
        assert.strictEqual(10, parsed.id);
        assert.strictEqual(channel_1.MessageType.Binary, parsed.type);
        if (parsed.type === channel_1.MessageType.Binary) {
            assert.notStrictEqual([1, 2, 3], parsed.data);
        }
        else {
            assert.fail("invalid message type");
        }
    });
});
