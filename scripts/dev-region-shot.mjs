// 区域放大截图工具:node scripts/dev-region-shot.mjs name=x,y,w,h:name2=... [scale]
const port = Number(process.env.CDP_PORT) || 9222;
const fs = await import('node:fs');
const http = await import('node:http');

// 原生 http 替代 fetch(避免间歇性连接失败)
function getJSON(p) {
    return new Promise((res, rej) => {
        http.get({ host: '127.0.0.1', port, path: p }, (r) => {
            let d = '';
            r.on('data', (c) => (d += c));
            r.on('end', () => {
                try {
                    res(JSON.parse(d));
                } catch (e) {
                    rej(e);
                }
            });
        }).on('error', rej);
    });
}

async function main() {
    const spec = process.argv[2] || '';
    const scale = parseInt(process.argv[3] || '2', 10);
    const list = await getJSON('/json/list');
    const page = list.find((t) => t.type === 'page' && t.url.includes('index.html'));
    if (!page) throw new Error('no page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });
    let id = 0;
    const pend = new Map();
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pend.has(m.id)) {
            pend.get(m.id)(m);
            pend.delete(m.id);
        }
    };
    const send = (method, params = {}) =>
        new Promise((res) => {
            const i = ++id;
            pend.set(i, res);
            ws.send(JSON.stringify({ id: i, method, params }));
        });
    await send('Page.enable');
    for (const item of spec.split(',')) {
        const [name, xywh] = item.split('=');
        const [x, y, w, h] = xywh.split(':').map((n) => parseInt(n, 10));
        const r = await send('Page.captureScreenshot', {
            format: 'png',
            clip: { x, y, width: w, height: h, scale },
            captureBeyondViewport: false,
        });
        if (!r.result) {
            console.log('skip', name, JSON.stringify(r.error || {}).slice(0, 120));
            continue;
        }
        fs.writeFileSync(
            process.env.TEMP + '/oicpp-shots/audit-' + name + '.png',
            Buffer.from(r.result.data, 'base64')
        );
        console.log('saved', name);
    }
    process.exit(0);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
