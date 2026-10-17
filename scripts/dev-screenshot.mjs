import WebSocket from 'ws';
import { pathToFileURL } from 'node:url';

// 通过 CDP 连接已启动的 Electron（--remote-debugging-port=9222）截取主窗口截图。
// 用法: node scripts/dev-screenshot.mjs <输出.png> [dark|light|monokai|github-dark|dracula|...] [附加JS]
// 仅用于本地视觉验证，不参与构建。
const port = process.env.CDP_PORT || 9222;

export async function fetchJson(url, fetchImpl = fetch) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} while requesting ${url}`);
    }
    return response.json();
}

async function main() {
    const [out, theme, extraJs] = process.argv.slice(2);
    const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    const page =
        list.find((t) => t.type === 'page' && t.url.includes('index.html')) || list.find((t) => t.type === 'page');
    if (!page) throw new Error('未找到页面调试目标: ' + JSON.stringify(list.map((t) => t.url)));

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    try {
        await new Promise((resolve, reject) => {
            ws.once('open', resolve);
            ws.once('error', reject);
        });

        let nextId = 0;
        const pending = new Map();
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.id && pending.has(message.id)) {
                pending.get(message.id)(message);
                pending.delete(message.id);
            }
        });
        const send = (method, params = {}) =>
            new Promise((resolve, reject) => {
                const id = ++nextId;
                pending.set(id, resolve);
                ws.send(JSON.stringify({ id, method, params }), (error) => {
                    if (error) {
                        pending.delete(id);
                        reject(error);
                    }
                });
            });
        const evaluate = async (expression) => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true });
            if (result.result?.exceptionDetails) {
                throw new Error(`Evaluation failed: ${JSON.stringify(result.result.exceptionDetails)}`);
            }
            return result.result?.result?.value;
        };

        if (extraJs) await evaluate(extraJs);

        if (theme) {
            const applied = await evaluate(`(() => {
            const b = document.body;
            const t = ${JSON.stringify(theme)};
            const tone = t.includes('light') ? 'light' : 'dark';
            for (const el of [document.body, document.documentElement]) {
                el.classList.remove('theme-light', 'theme-dark', 'light-theme', 'dark-theme');
                el.setAttribute('data-theme', t);
                el.setAttribute('data-editor-theme', tone);
                el.classList.add(tone === 'light' ? 'theme-light' : 'theme-dark');
                el.classList.add(tone === 'light' ? 'light-theme' : 'dark-theme');
            }
            return (b.getAttribute('data-theme') || '') + ' / ' + (b.getAttribute('data-editor-theme') || '');
        })()`);
            console.log('theme ->', applied);
        }

        await send('Page.enable');
        await new Promise((resolve) => setTimeout(resolve, 700));
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        if (!screenshot.result) {
            throw new Error(`Screenshot capture failed: ${JSON.stringify(screenshot)}`);
        }
        const { writeFileSync } = await import('node:fs');
        writeFileSync(out, Buffer.from(screenshot.result.data, 'base64'));
        console.log('Saved', out);
    } finally {
        ws.close();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}
