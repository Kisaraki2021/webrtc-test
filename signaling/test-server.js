const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

// SSL証明書を読み込み
const options = {
    key: fs.readFileSync(path.join(__dirname, '..', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'cert.pem'))
};

// HTTPS サーバーを作成
const server = https.createServer(options, (req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <html>
            <head><title>WebSocket接続テスト</title></head>
            <body>
                <h1>WebSocket接続テスト (HTTPS)</h1>
                <button onclick="testConnection()">接続テスト</button>
                <div id="log"></div>
                <script>
                function log(msg) {
                    document.getElementById('log').innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + msg + '</div>';
                }
                function testConnection() {
                    log('WebSocket接続を試行中...');
                    const ws = new WebSocket('wss://localhost:3000');
                    ws.onopen = () => log('✅ WebSocket接続成功!');
                    ws.onerror = (e) => log('❌ WebSocket接続エラー: ' + e);
                    ws.onclose = () => log('WebSocket接続が閉じられました');
                }
                </script>
            </body>
            </html>
        `);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// WebSocket サーバーをHTTPSサーバーにアタッチ
const wss = new WebSocket.Server({ server });

const clients = new Map();

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

server.listen(3000, () => {
    console.log('HTTPS + WebSocket サーバーが https://localhost:3000 で起動しました');
    console.log('接続テスト: https://localhost:3000 にアクセスしてください');
    console.log('注意: 自己署名証明書のため、ブラウザで「詳細設定」→「安全ではないページに移動」をクリックしてください');
});
