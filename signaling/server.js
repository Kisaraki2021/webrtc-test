// server.js
// 実行: npm init -y && npm install ws
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });
/*
シンプルなルーム/役割管理:
- broadcaster は "broadcaster" メッセージで登録
- viewer は "viewer" メッセージで登録
- サーバは SDP/ICE を相手に転送する (toフィールドで指定)
*/

const clients = new Map(); // id -> { ws, role }

function send(ws, obj) { ws.send(JSON.stringify(obj)); }

wss.on('connection', (ws) => {
    let myId = null;
    ws.on('message', (msg) => {
        let data;
        try { data = JSON.parse(msg); } catch (e) { return; }
        if (data.type === 'register') {
            myId = data.id;
            clients.set(myId, { ws, role: data.role });
            console.log('register', myId, data.role);
            return;
        }
        // forward messages to target id
        if (data.target && clients.has(data.target)) {
            const target = clients.get(data.target).ws;
            send(target, { from: myId, payload: data.payload, kind: data.kind });
        } else if (data.broadcast) { // optional broadcast to all viewers
            for (const [id, c] of clients) {
                if (id !== myId && c.role === data.broadcast) send(c.ws, { from: myId, payload: data.payload, kind: data.kind });
            }
        }
    });

    ws.on('close', () => {
        if (myId) clients.delete(myId);
    });
});

console.log('Signaling server running on ws://localhost:3000');
