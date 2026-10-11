'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const mainJs = read('src/main.js');
const preloadJs = read('src/preload.js');
const comparerJs = read('src/renderer/js/sidebar/codeComparer.js');

test('run-program lifts timeLimit out of the options object', () => {
    // Regression: memoryLimit was lifted but timeLimit was not, so every caller
    // using the single-object form ran with no timeout and no kill timer.
    const handler = mainJs.slice(mainJs.indexOf("ipcMain.handle('run-program'"));
    assert.match(handler, /executablePathOrOptions\.timeLimit !== undefined/);
    assert.match(handler, /timeLimit = executablePathOrOptions\.timeLimit/);
});

test('markdown rendering cannot emit raw HTML', () => {
    // The rendered markdown goes straight into innerHTML and index.html's CSP
    // allows unsafe-inline, so html:true was a stored-XSS entry point.
    assert.match(preloadJs, /new MarkdownIt\(\{\s*\n?\s*html: false/);
});

test('bulk settings dump does not carry the account credential', () => {
    const handler = mainJs.slice(mainJs.indexOf("ipcMain.handle('get-all-settings'"));
    const end = handler.indexOf('ipcMain.handle(', 10);
    const body = end > 0 ? handler.slice(0, end) : handler.slice(0, 400);
    assert.match(body, /delete safe\.account/);
});

test('exported settings omit the account credential', () => {
    const fn = mainJs.slice(mainJs.indexOf('function exportSettings'));
    assert.match(fn.slice(0, 600), /delete exportable\.account/);
});

test('settings file and directory are created owner-only', () => {
    assert.match(mainJs, /mkdirSync\(settingsDir, \{ recursive: true, mode: 0o700 \}/);
    const line = mainJs.split('\n').find((l) => l.includes('writeFileSync(settingsPath'));
    assert.ok(line, 'settings writeFileSync not found');
    assert.match(line, /mode: 0o600/);
});

test('the comparer does not run its standard program unbounded', () => {
    // timeLimit 0 meant no TLE and no kill timer: a std program that looped
    // wedged the worker forever and the comparer could not be restarted.
    const line = comparerJs.split('\n').find((l) => l.includes('stdOutput = await this.runProgram'));
    assert.ok(line, 'could not find the std runProgram call');
    assert.doesNotMatch(line, /runInput, 0\)/);
});

test('a swallowed per-case error can no longer report a clean pass', () => {
    const anchor = comparerJs.indexOf('This used to just');
    assert.ok(anchor > 0, 'the comparer worker catch was not found');
    const near = comparerJs.slice(anchor, anchor + 900);
    assert.match(near, /errorOccurred = true/);
    assert.match(near, /failedGenerations\+\+/);
    assert.doesNotMatch(near, /^\s*continue;\s*$/m);
});
