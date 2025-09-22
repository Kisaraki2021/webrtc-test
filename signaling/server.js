// server.js
// 実行: npm init -y && npm install ws
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

const clients = new Map(); // id -> { ws, role }

function send(ws, obj) {
    try {
        ws.send(JSON.stringify(obj));
        console.log('送信:', obj);
    } catch (e) {
        console.error('送信エラー:', e);
    }
}

wss.on('connection', (ws) => {
    console.log('新しいWebSocket接続が確立されました');
    let myId = null;

    ws.on('message', (msg) => {
        console.log('受信メッセージ:', msg.toString());
        let data;
        try {
            data = JSON.parse(msg);
        } catch (e) {
            console.error('JSONパースエラー:', e);
            return;
        }

        if (data.type === 'register') {
            myId = data.id;
            clients.set(myId, { ws, role: data.role });
            console.log('クライアント登録:', myId, data.role);
            console.log('現在の接続数:', clients.size);
            return;
        }

        // forward messages to target id
        if (data.target && clients.has(data.target)) {
            const target = clients.get(data.target).ws;
            console.log(`メッセージを転送: ${myId} -> ${data.target} (${data.kind})`);
            send(target, { from: myId, payload: data.payload, kind: data.kind });
        } else if (data.target) {
            console.warn(`ターゲット ${data.target} が見つかりません`);
        } else if (data.broadcast) { // optional broadcast to all viewers
            console.log(`ブロードキャスト: ${myId} -> ${data.broadcast}`);
            for (const [id, c] of clients) {
                if (id !== myId && c.role === data.broadcast) {
                    send(c.ws, { from: myId, payload: data.payload, kind: data.kind });
                }
            }
        }
    });

    ws.on('close', () => {
        if (myId) {
            console.log('クライアント切断:', myId);
            clients.delete(myId);
            console.log('現在の接続数:', clients.size);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocketエラー:', error);
    });
});

console.log('Signaling server running on ws://localhost:3000');
console.log('接続テスト用URL: http://localhost:3000 でアクセスしてみてください');
