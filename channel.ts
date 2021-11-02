import {WebSocket} from 'ws'

export enum MessageType {
	Cancel         = 1,
	Binary         = 2,
	Json           = 3,
	JsonWithBinary = 4,
	Error          = 5, // ????
}

//
// transport message:
//
//   |type(u8)        |id(u32)|ref-id(u32)|
//   |Binary          |id(u32)|ref-id(u32)|data|
//   |Json            |id(u32)|ref-id(u32)|json|
//   |JsonWithBinary  |id(u32)|ref-id(u32)|json-len(u32)|json|data?|
//   |Cancel          |id(u32)|ref-id(u32)|cancel-id(u32)|
//  
//

export type MessageCancel = {
	type: MessageType.Cancel;
	id: number;
	refID: number;
	cancelID: number;
}

export type MessageBinary = {
	type: MessageType.Binary;
	id: number;
	refID: number;
	data: Uint8Array;
}

export type MessageJson = {
	type: MessageType.Json;
	id: number;
	refID: number;
	body: {};
}

export type MessageError = {
	type: MessageType.Error;
	id: number;
	refID: number;
	body: {};
}

export type MessageJsonWithBinary = {
	type: MessageType.JsonWithBinary;
	id: number;
	refID: number;
	body: {};
	data: Uint8Array
}

export type Message = MessageCancel | MessageBinary | MessageJson | MessageJsonWithBinary| MessageError;

class Request {
	promise: Promise<any>

	id: number;
	constructor(messageID: number) {
		this.id = messageID;
		var self = this;
		this.promise = new Promise(function(resolve, reject) {
			/* @ts-ignore */
			self.resolve = resolve;
			/* @ts-ignore */
			self.reject = reject;
		});
		/* @ts-ignore */
		this.then = this.promise.then.bind(this.promise);
		/* @ts-ignore */
                this.catch = this.promise.catch.bind(this.promise);
	}
}

export default class Channel {
	_stringEncoder = new TextEncoder();
	_stringDecoder = new TextDecoder();
	_msgID = 1;
	_pendingRequests: {} = {};
	_ws: WebSocket | null;

	 onRequest: any = () => {
		 console.error("handler is not installed");
	 };

	 constructor(ws: WebSocket | null) {
		this._ws = ws;
		var self = this;
		if (ws) {
			ws.onmessage = function onmessage(data, isBinary) {
				if (data.data !== null) {
					let buf = new Uint8Array(data.data);
				        self._onBinaryMessage(buf);
					return;
				}
			}
		}
	}
	

	_onBinaryMessage(buf: Uint8Array) {
		let msg = this.parseMessage(buf);
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
			case MessageType.Json: {
				if (msg.refID == 0) {
					this._onRequest(msg.id, msg.body, null);
				} else  {
					this._onResponse(msg.refID, msg.body, null);
				}
			}
			break;
			case MessageType.JsonWithBinary:
				if (msg.refID == 0) {
					this._onRequest(msg.id, msg.body, msg.data);
				} else  {
					this._onResponse(msg.refID, msg.body, msg.data);
				}
			break;
			case MessageType.Binary:
				if (msg.refID == 0) {
					this._onRequest(msg.id, {}, msg.data);
				} else  {
					this._onResponse(msg.refID, {}, msg.data);
				}
			break;
		}
	}

	_onRequest(id: number, body: {}, data: Uint8Array | null) {
		var self = this;
		this.onRequest(body, data)
		.then(function(res) {
			console.log(res);
			self.reply(id, res.body, res.data);
		})
		.catch(function (err) {
			console.log(err);
			self.replyError(id, err);
		})
	}

	// request - response pattern
	request(body: {}, data: Uint8Array | null): Promise<any> {
		let mID = this._msgID ++;
		let req = new Request(mID);
		let refID = 0;
		let buf: Uint8Array;
		if (data === null) {
			buf = this._writeJson(req.id, refID, body);
		} else {
			buf = this._writeJsonWithBinary(req.id, refID, body, data);
		}

		this._pendingRequests[mID] = req;

		this._ws?.send(buf);
		return req.promise;
	}

	// one way notification
	notify(body: {}, data: Uint8Array | null) {
		let refID = 0;
		let buf: Uint8Array;
		if (data === null) {
			buf = this._writeJson(0, refID, body);
		} else {
			buf = this._writeJsonWithBinary(0, refID, body, data);
		}

		this._ws?.send(buf);
	}

	reply(refID: number, body: {}, data: Uint8Array | null) {
		let mID = 0;
		let buf: Uint8Array
		if (data === null) {
			buf = this._writeJson(mID, refID, body);
		} else {
			buf = this._writeJsonWithBinary(mID, refID, body, data);
		}

		this._ws?.send(buf);
	}

	replyError(refID: number, body: {}) {
		let mID = 0;
		let buf: Uint8Array
		buf = this._writeJson(mID, refID, body);

		this._ws?.send(buf);
	}

	_onResponse(refID: number, body: {}, data: Uint8Array | null) {
		let req = this._pendingRequests[refID];
		if (!req) {
			return;
		}
		delete this._pendingRequests[refID];
		if (req.resolve) {
			req.resolve({body, data});
		}
	}

	_onError(refID: number, body: {}) {
		let req = this._pendingRequests[refID];
		if (!req) {
			return;
		}
		delete this._pendingRequests[refID];
		if (req.reject) {
			req.reject(body);
		}
	}

	_onCancel(cancelID: number) {
		let req = this._pendingRequests[cancelID];
		if (!req) {
			return;
		}


		delete this._pendingRequests[cancelID];
		if (req.resolve) {
			req.resolve(null);
		}
	}


	parseMessage(buf: Uint8Array): Message | null {
		if (buf.length < 5) {
			return null;
		}

		let type: MessageType = buf[0];
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
	}

	_parseJson(buf: Uint8Array): MessageJson | null {
		// type(u8) | id(u32) | ref-id(u32) | json(...)?
		if (buf.length < 9) {
			return null;
		}

		let id     = this._getU32(buf.subarray(1));
		let refID  = this._getU32(buf.subarray(5));
		var body   = {}

		if (buf.length > 9) {
			let jsonBytes = buf.subarray(9);
			let jsonString = this._stringDecoder.decode(jsonBytes);
			let parsedJSON = JSON.parse(jsonString);
			body = parsedJSON;
		}

		return {
			type: MessageType.Json,
			id,
			refID,
			body
		}
	}

	_writeJson(id: number, refID: number, body: {}): Uint8Array {
		let jsonString = JSON.stringify(body);
		let jsonData = this._stringEncoder.encode(jsonString);
		let jsonLen = jsonData.length;
		var buf = new Uint8Array(9 + jsonLen);
		buf[0] = MessageType.Json;
		this._putU32(buf, id, 1);
		this._putU32(buf, refID, 5);
		buf.set(jsonData, 9);
		return buf;
	}

	_parseJsonWithBinary(buf: Uint8Array): MessageJsonWithBinary | null {
		// type(u8) | id(u32) | ref-id(u32) | json-len(u32) | json(...) | data(...) |
		if (buf.length < 13) {
			return null;
		}

		let id    =  this._getU32(buf.subarray(1));
		let refID =  this._getU32(buf.subarray(5));
		let jsonLen = this._getU32(buf.subarray(9));
		var body: {} = {}

		if (jsonLen > 0) {
			let jsonBytes = buf.subarray(13, 13 + jsonLen);
			let jsonString = this._stringDecoder.decode(jsonBytes);
			let parsedJSON = JSON.parse(jsonString);
			body = parsedJSON;
		}

		let data = buf.subarray(13 + jsonLen);

		return {
			type: MessageType.JsonWithBinary,
			id,
			refID,
			body,
			data
		}
	}

	_writeJsonWithBinary(id: number, refID: number, body: {}, data: Uint8Array): Uint8Array {
		let jsonString = JSON.stringify(body);
		let jsonData = this._stringEncoder.encode(jsonString);
		let jsonLen = jsonData.length;
		var buf = new Uint8Array(1 + 4 + 4 + 4 + jsonLen + data.length);
		buf[0] = MessageType.JsonWithBinary;
		this._putU32(buf, id,      1);
		this._putU32(buf, refID,   5);
		this._putU32(buf, jsonLen, 9);
		buf.set(jsonData, 13);
		buf.set(data, 13 + jsonLen);
		return buf;
	}

	_parseCancel(buf: Uint8Array): MessageCancel | null {
		// type(u8) | id(u32) | ref-id(u32) | cancelID(u32)
		if (buf.length < 13) {
			return null;
		}
		let id       = this._getU32(buf.subarray(1));
		let refID    = this._getU32(buf.subarray(5));
		let cancelID = this._getU32(buf.subarray(9));

		return {
			type: MessageType.Cancel,
			id,
			refID,
			cancelID
		}
	}

	_writeCancel(id: number, refID: number, cancelID: number): Uint8Array {
		var buf = new Uint8Array(13);
		buf[0] = MessageType.Cancel;
		this._putU32(buf, id,       1);
		this._putU32(buf, refID,    5);
		this._putU32(buf, cancelID, 9);
		return buf;
	}

	_parseBinary(buf: Uint8Array): MessageBinary {
		// type(u8) | id(u32) | ref-id(u32) | data
		if (buf.length < 9) {
			return null;
		}
		let id    = this._getU32(buf.subarray(1));
		let refID = this._getU32(buf.subarray(5));
		let data  = buf.subarray(9);

		return {
			type: MessageType.Binary,
			id,
			refID,
			data
		}
	}

	_writeBinary(id: number, refID: number, data: Uint8Array): Uint8Array {
		let len = 1 + 4 + 4 + data.length;
		let buf = new Uint8Array(len);
		buf[0] = MessageType.Binary;
		this._putU32(buf, id,    1);
		this._putU32(buf, refID, 5);
		buf.set(data, 9);
		return buf;
	}

	_putU32(buf: Uint8Array, value: number, at: number) {
              let b0 = value & 0xff; 
              let b1 = (value >> 8) & 0xff; 
              let b2 = (value >> 16) & 0xff; 
              let b3 = (value >> 24) & 0xff; 

	      buf[at + 0] = b3;
	      buf[at + 1] = b2;
	      buf[at + 2] = b1;
	      buf[at + 3] = b0;
	}

	_getU32(buf: Uint8Array): number {
		let b3 = buf[0];
		let b2 = buf[1];
		let b1 = buf[2];
		let b0 = buf[3];

		return (b3 << 24) | (b2 << 16) | (b1 << 8) | (b0);
	}
}
