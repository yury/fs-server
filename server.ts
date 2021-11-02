import WebSocket, { WebSocketServer } from 'ws';
import Channel from './channel';
import FSProvider from './fsprovider';




const wss = new WebSocketServer({
  port: 8000,
});

const clients = {};


wss.on('connection', (ws) => {
    const id = Math.random() * 360;

    console.log('got connection');
  
    ws.onclose = function close() {
	    delete clients[id];
    }
    let ch = new Channel(ws);
    let fs = new FSProvider(ch, process.cwd());
    clients[id] = fs;
});
