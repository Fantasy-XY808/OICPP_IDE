'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const langDir = path.join(__dirname, '..', 'src', 'lang');

function loadLocale(fileName) {
    const raw = fs.readFileSync(path.join(langDir, fileName), 'utf8');
    return JSON.parse(raw);
}

function flattenLeaves(value, prefix, out) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) {
            flattenLeaves(child, prefix ? prefix + '.' + key : key, out);
        }
        return out;
    }
    out.add(prefix);
    return out;
}

function leafKeys(locale) {
    return flattenLeaves(locale, '', new Set());
}

const zh = loadLocale('zh-cn.json');
const en = loadLocale('en.json');
const zhKeys = leafKeys(zh);
const enKeys = leafKeys(en);

test('zh-cn.json and en.json cover exactly the same keys', () => {
    const missingInEn = [...zhKeys].filter(key => !enKeys.has(key)).sort();
    const missingInZh = [...enKeys].filter(key => !zhKeys.has(key)).sort();

    assert.deepEqual(missingInEn, [], 'keys present in zh-cn.json but missing from en.json');
    assert.deepEqual(missingInZh, [], 'keys present in en.json but missing from zh-cn.json');
});

test('every locale declares meta.code so the main process can discover it', () => {
    assert.equal(typeof zh.meta?.code, 'string');
    assert.equal(typeof en.meta?.code, 'string');
});

test('no translation is an empty string', () => {
    for (const [name, locale] of [['zh-cn.json', zh], ['en.json', en]]) {
        for (const key of leafKeys(locale)) {
            if (key.startsWith('meta.')) continue;
            const value = key.split('.').reduce((acc, part) => acc?.[part], locale);
            assert.notEqual(
                typeof value === 'string' ? value.trim() : value,
                '',
                'empty translation for ' + key + ' in ' + name
            );
        }
    }
});

test('the locale files are large enough to be the real ones', () => {
    // guards against a truncated fixture silently passing the parity check
    assert.ok(zhKeys.size > 500, 'zh-cn.json looks truncated: ' + zhKeys.size + ' leaves');
    assert.ok(enKeys.size > 500, 'en.json looks truncated: ' + enKeys.size + ' leaves');
});
