"use strict";
exports.__esModule = true;
var ws_1 = require("ws");
var channel_1 = require("./channel");
var fsprovider_1 = require("./fsprovider");
var wss = new ws_1.WebSocketServer({
    port: 8000
});
var clients = {};
wss.on('connection', function (ws) {
    var id = Math.random() * 360;
    console.log('got connection');
    ws.onclose = function close() {
        delete clients[id];
    };
    var ch = new channel_1["default"](ws);
    var fs = new fsprovider_1["default"](ch, process.cwd());
    clients[id] = fs;
});
