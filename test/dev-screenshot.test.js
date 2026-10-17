'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('CDP screenshot utility fetches JSON and reports HTTP errors', async () => {
    const { fetchJson } = await import('../scripts/dev-screenshot.mjs');
    let requestUrl;

    const result = await fetchJson('http://127.0.0.1:9222/json/list', async (url) => {
        requestUrl = url;
        return {
            ok: true,
            async json() {
                return [{ type: 'page' }];
            },
        };
    });

    assert.equal(requestUrl, 'http://127.0.0.1:9222/json/list');
    assert.deepEqual(result, [{ type: 'page' }]);
    await assert.rejects(
        fetchJson('/json/list', async () => ({ ok: false, status: 503 })),
        /HTTP 503 while requesting \/json\/list/
    );
});
