'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const nsiPath = path.join(repoRoot, 'installer.nsi');
const nsiBytes = fs.readFileSync(nsiPath);
const nsiText = nsiBytes.toString('utf8');

const UTF8_BOM = [0xef, 0xbb, 0xbf];

const workflowsDir = path.join(repoRoot, '.github', 'workflows');
const workflowFiles = fs.readdirSync(workflowsDir)
    .filter(name => name.endsWith('.yml'))
    .map(name => path.join(workflowsDir, name));

test('installer.nsi starts with a UTF-8 BOM', () => {
    // NSIS decides whether a script is UTF-8 purely from this BOM. Without it,
    // makensis decodes the script through the machine ANSI codepage and every
    // Chinese literal ships as mojibake in the installer UI.
    assert.deepEqual(
        [...nsiBytes.slice(0, 3)],
        UTF8_BOM,
        'installer.nsi lost its UTF-8 BOM'
    );
});

test('installer.nsi decodes as clean UTF-8', () => {
    assert.ok(!nsiText.includes('\uFFFD'), 'installer.nsi contains U+FFFD replacement characters');
    assert.ok(nsiText.charCodeAt(0) === 0xFEFF, 'BOM should survive decoding as U+FEFF');
});

test('installer.nsi still carries its Chinese UI literals', () => {
    assert.ok(/MUI_LANGUAGE "SimpChinese"/.test(nsiText), 'missing SimpChinese MUI language');
    assert.ok(/Unicode true/.test(nsiText), 'missing "Unicode true" directive');
    const chinese = nsiText.match(/[\u4e00-\u9fff]+/g) || [];
    assert.ok(chinese.length > 20, 'expected many Chinese literals, found ' + chinese.length);
});

test('installer.nsi declares a PRODUCT_VERSION that the CI rewrite can target', () => {
    const match = nsiText.match(/^!define PRODUCT_VERSION "([^"]*)"/m);
    assert.ok(match, 'no !define PRODUCT_VERSION line found');
    assert.ok(match[1].length > 0, 'PRODUCT_VERSION is empty');
});

test('every workflow that rewrites installer.nsi reads and writes it as UTF-8', () => {
    const offenders = [];

    for (const file of workflowFiles) {
        const text = fs.readFileSync(file, 'utf8');
        if (!text.includes('installer.nsi')) continue;
        // Get-Content without -Encoding decodes through the ANSI codepage and
        // corrupts the literals before makensis ever sees them.
        if (/Get-Content\s+\$nsiPath\s+-Raw(?!\s+-Encoding)/.test(text)) {
            offenders.push(path.basename(file) + ': Get-Content $nsiPath -Raw without -Encoding');
        }
        // Set-Content -Encoding UTF8 means "with BOM" on PowerShell 5.1 but
        // "without BOM" on PowerShell 7, so it cannot be relied on either way.
        if (/Set-Content\s+\$nsiPath/.test(text)) {
            offenders.push(path.basename(file) + ': Set-Content $nsiPath cannot guarantee the BOM');
        }
    }

    assert.deepEqual(offenders, [], 'installer encoding handling regressed:\n' + offenders.join('\n'));
});
