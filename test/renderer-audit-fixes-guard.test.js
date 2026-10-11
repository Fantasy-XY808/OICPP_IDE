'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const tabsJs = read('src/renderer/js/tabs.js');
const monacoJs = read('src/renderer/js/monaco-editor-manager.js');
const comparerJs = read('src/renderer/js/sidebar/codeComparer.js');

test('closeAllTabs passes the tab key, not the file name, to closeTab', () => {
    // Regression: it fed [...this.tabs.keys()] (uniqueKeys) into closeTab's
    // fileName slot, so closeTab fell through to getTabByFileName and matched
    // nothing -- every workspace switch left the old tabs, editors and file
    // watchers alive, and Ctrl+S could write into the previous workspace.
    const body = tabsJs.slice(tabsJs.indexOf('closeAllTabs() {'));
    const segment = body.slice(0, 1600);
    assert.match(segment, /uniqueKeyOverride/);
    assert.doesNotMatch(segment, /tabsToClose\.forEach\(fileName/);
});

test('a late file-read reply cannot land in a different tab', () => {
    // Regression: the reply was matched per tab but applied through
    // setEditorContent(), which writes the globally current editor.
    const anchor = tabsJs.indexOf('handleFileRead');
    assert.ok(anchor > 0, 'handleFileRead not found');
    const segment = tabsJs.slice(anchor, anchor + 1400);
    assert.match(segment, /stillOnScreen/);
});

test('per-editor resize listener and observer are released on close', () => {
    assert.match(monacoJs, /_windowResizeHandler = layoutEditor/);
    assert.match(monacoJs, /_containerResizeObserver = resizeObserver/);
    const defIndex = monacoJs.indexOf('    cleanupEditor(');
    assert.ok(defIndex > 0, 'cleanupEditor definition not found');
    const cleanup = monacoJs.slice(defIndex);
    const segment = cleanup.slice(0, 2500);
    assert.match(segment, /removeEventListener\('resize'/);
    assert.match(segment, /_containerResizeObserver\.disconnect\(\)/);
    assert.match(segment, /_compilerErrorDecorations\.delete/);
});

test('comparer task map is evicted instead of growing forever', () => {
    assert.match(comparerJs, /_evictOldTasks/);
    assert.match(comparerJs, /MAX_RETAINED_TASKS/);
    assert.match(comparerJs, /this\.tasks\.delete\(oldestKey\)/);
});
