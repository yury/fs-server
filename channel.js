"use strict";
exports.__esModule = true;
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Cancel"] = 1] = "Cancel";
    MessageType[MessageType["Binary"] = 2] = "Binary";
    MessageType[MessageType["Json"] = 3] = "Json";
    MessageType[MessageType["JsonWithBinary"] = 4] = "JsonWithBinary";
    MessageType[MessageType["Error"] = 5] = "Error";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var Request = /** @class */ (function () {
    function Request(messageID) {
        this.id = messageID;
        var self = this;
        this.promise = new Promise(function (resolve, reject) {
            /* @ts-ignore */
            self.resolve = resolve;
            /* @ts-ignore */
            self.reject = reject;
        });
        /* @ts-ignore */
        this.then = this.promise.then.bind(this.promise);
        /* @ts-ignore */
        this["catch"] = this.promise["catch"].bind(this.promise);
    }
    return Request;
}());
var Channel = /** @class */ (function () {
    function Channel(ws) {
        this._stringEncoder = new TextEncoder();
        this._stringDecoder = new TextDecoder();
        this._msgID = 1;
        this._pendingRequests = {};
        this.onRequest = function () {
            console.error("handler is not installed");
        };
        this._ws = ws;
        var self = this;
        if (ws) {
            ws.onmessage = function onmessage(data, isBinary) {
                if (data.data !== null) {
                    var buf = new Uint8Array(data.data);
                    self._onBinaryMessage(buf);
                    return;
                }
            };
        }
    }
    Channel.prototype._onBinaryMessage = function (buf) {
        var msg = this.parseMessage(buf);
        if (!msg) {
            console.error('unknown message', buf);
            return;
        }
        switch (msg.type) {
            case MessageType.Cancel:
                this._onCancel(msg.cancelID);
                break;
            case MessageType.Error:
                this._onError(msg.refID, msg.body);
                break;
            case MessageType.Json:
                {
                    if (msg.refID == 0) {
                        this._onRequest(msg.id, msg.body, null);
                    }
                    else {
                        this._onResponse(msg.refID, msg.body, null);
                    }
                }
                break;
            case MessageType.JsonWithBinary:
                if (msg.refID == 0) {
                    this._onRequest(msg.id, msg.body, msg.data);
                }
                else {
                    this._onResponse(msg.refID, msg.body, msg.data);
                }
                break;
            case MessageType.Binary:
                if (msg.refID == 0) {
                    this._onRequest(msg.id, {}, msg.data);
                }
                else {
                    this._onResponse(msg.refID, {}, msg.data);
                }
                break;
        }
    };
    Channel.prototype._onRequest = function (id, body, data) {
        var self = this;
        this.onRequest(body, data)
            .then(function (res) {
            console.log(res);
            self.reply(id, res.body, res.data);
        })["catch"](function (err) {
            console.log(err);
            self.replyError(id, err);
        });
    };
    // request - response pattern
    Channel.prototype.request = function (body, data) {
        var _a;
        var mID = this._msgID++;
        var req = new Request(mID);
        var refID = 0;
        var buf;
        if (data === null) {
            buf = this._writeJson(req.id, refID, body);
        }
        else {
            buf = this._writeJsonWithBinary(req.id, refID, body, data);
        }
        this._pendingRequests[mID] = req;
        (_a = this._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
        return req.promise;
    };
    // one way notification
    Channel.prototype.notify = function (body, data) {
        var _a;
        var refID = 0;
        var buf;
        if (data === null) {
            buf = this._writeJson(0, refID, body);
        }
        else {
            buf = this._writeJsonWithBinary(0, refID, body, data);
        }
        (_a = this._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
    };
    Channel.prototype.reply = function (refID, body, data) {
        var _a;
        var mID = 0;
        var buf;
        if (data === null) {
            buf = this._writeJson(mID, refID, body);
        }
        else {
            buf = this._writeJsonWithBinary(mID, refID, body, data);
        }
        (_a = this._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
    };
    Channel.prototype.replyError = function (refID, body) {
        var _a;
        var mID = 0;
        var buf;
        buf = this._writeJson(mID, refID, body);
        (_a = this._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
    };
    Channel.prototype._onResponse = function (refID, body, data) {
        var req = this._pendingRequests[refID];
        if (!req) {
            return;
        }
        delete this._pendingRequests[refID];
        if (req.resolve) {
            req.resolve({ body: body, data: data });
        }
    };
    Channel.prototype._onError = function (refID, body) {
        var req = this._pendingRequests[refID];
        if (!req) {
            return;
        }
        delete this._pendingRequests[refID];
        if (req.reject) {
            req.reject(body);
        }
    };
    Channel.prototype._onCancel = function (cancelID) {
        var req = this._pendingRequests[cancelID];
        if (!req) {
            return;
        }
        delete this._pendingRequests[cancelID];
        if (req.resolve) {
            req.resolve(null);
        }
    };
    Channel.prototype.parseMessage = function (buf) {
        if (buf.length < 5) {
            return null;
        }
        var type = buf[0];
        switch (type) {
            case MessageType.Cancel:
                return this._parseCancel(buf);
            case MessageType.Json:
                return this._parseJson(buf);
            case MessageType.JsonWithBinary:
                return this._parseJsonWithBinary(buf);
            case MessageType.Binary:
                return this._parseBinary(buf);
            default:
                return null;
        }
    };
    Channel.prototype._parseJson = function (buf) {
        // type(u8) | id(u32) | ref-id(u32) | json(...)?
        if (buf.length < 9) {
            return null;
        }
        var id = this._getU32(buf.subarray(1));
        var refID = this._getU32(buf.subarray(5));
        var body = {};
        if (buf.length > 9) {
            var jsonBytes = buf.subarray(9);
            var jsonString = this._stringDecoder.decode(jsonBytes);
            var parsedJSON = JSON.parse(jsonString);
            body = parsedJSON;
        }
        return {
            type: MessageType.Json,
            id: id,
            refID: refID,
            body: body
        };
    };
    Channel.prototype._writeJson = function (id, refID, body) {
        var jsonString = JSON.stringify(body);
        var jsonData = this._stringEncoder.encode(jsonString);
        var jsonLen = jsonData.length;
        var buf = new Uint8Array(9 + jsonLen);
        buf[0] = MessageType.Json;
        this._putU32(buf, id, 1);
        this._putU32(buf, refID, 5);
        buf.set(jsonData, 9);
        return buf;
    };
    Channel.prototype._parseJsonWithBinary = function (buf) {
        // type(u8) | id(u32) | ref-id(u32) | json-len(u32) | json(...) | data(...) |
        if (buf.length < 13) {
            return null;
        }
        var id = this._getU32(buf.subarray(1));
        var refID = this._getU32(buf.subarray(5));
        var jsonLen = this._getU32(buf.subarray(9));
        var body = {};
        if (jsonLen > 0) {
            var jsonBytes = buf.subarray(13, 13 + jsonLen);
            var jsonString = this._stringDecoder.decode(jsonBytes);
            var parsedJSON = JSON.parse(jsonString);
            body = parsedJSON;
        }
        var data = buf.subarray(13 + jsonLen);
        return {
            type: MessageType.JsonWithBinary,
            id: id,
            refID: refID,
            body: body,
            data: data
        };
    };
    Channel.prototype._writeJsonWithBinary = function (id, refID, body, data) {
        var jsonString = JSON.stringify(body);
        var jsonData = this._stringEncoder.encode(jsonString);
        var jsonLen = jsonData.length;
        var buf = new Uint8Array(1 + 4 + 4 + 4 + jsonLen + data.length);
        buf[0] = MessageType.JsonWithBinary;
        this._putU32(buf, id, 1);
        this._putU32(buf, refID, 5);
        this._putU32(buf, jsonLen, 9);
        buf.set(jsonData, 13);
        buf.set(data, 13 + jsonLen);
        return buf;
    };
    Channel.prototype._parseCancel = function (buf) {
        // type(u8) | id(u32) | ref-id(u32) | cancelID(u32)
        if (buf.length < 13) {
            return null;
        }
        var id = this._getU32(buf.subarray(1));
        var refID = this._getU32(buf.subarray(5));
        var cancelID = this._getU32(buf.subarray(9));
        return {
            type: MessageType.Cancel,
            id: id,
            refID: refID,
            cancelID: cancelID
        };
    };
    Channel.prototype._writeCancel = function (id, refID, cancelID) {
        var buf = new Uint8Array(13);
        buf[0] = MessageType.Cancel;
        this._putU32(buf, id, 1);
        this._putU32(buf, refID, 5);
        this._putU32(buf, cancelID, 9);
        return buf;
    };
    Channel.prototype._parseBinary = function (buf) {
        // type(u8) | id(u32) | ref-id(u32) | data
        if (buf.length < 9) {
            return null;
        }
        var id = this._getU32(buf.subarray(1));
        var refID = this._getU32(buf.subarray(5));
        var data = buf.subarray(9);
        return {
            type: MessageType.Binary,
            id: id,
            refID: refID,
            data: data
        };
    };
    Channel.prototype._writeBinary = function (id, refID, data) {
        var len = 1 + 4 + 4 + data.length;
        var buf = new Uint8Array(len);
        buf[0] = MessageType.Binary;
        this._putU32(buf, id, 1);
        this._putU32(buf, refID, 5);
        buf.set(data, 9);
        return buf;
    };
    Channel.prototype._putU32 = function (buf, value, at) {
        var b0 = value & 0xff;
        var b1 = (value >> 8) & 0xff;
        var b2 = (value >> 16) & 0xff;
        var b3 = (value >> 24) & 0xff;
        buf[at + 0] = b3;
        buf[at + 1] = b2;
        buf[at + 2] = b1;
        buf[at + 3] = b0;
    };
    Channel.prototype._getU32 = function (buf) {
        var b3 = buf[0];
        var b2 = buf[1];
        var b1 = buf[2];
        var b0 = buf[3];
        return (b3 << 24) | (b2 << 16) | (b1 << 8) | (b0);
    };
    return Channel;
}());
exports["default"] = Channel;
