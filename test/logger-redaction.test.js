'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// logger.js exports a singleton instance; the class is reachable through the
// prototype chain, so this test does not require widening the module's API.
const loggerInstance = require('../src/utils/logger.js');
const Logger = Object.getPrototypeOf(loggerInstance).constructor;

const render = (args, level = 'warn') => String(Logger.stringifyArgs(args, { level }));

test('object keys that look like credentials are redacted', () => {
    const out = render([{
        loginToken: 'SECRET123',
        access_token: 'ACCESSSECRET',
        cookie: 'a=b',
        nested: { csrfToken: 'CSRFVALUE', password: 'hunter2' },
        user: 'bob',
        path: '/home/user'
    }]);

    for (const secret of ['SECRET123', 'ACCESSSECRET', 'a=b', 'CSRFVALUE', 'hunter2']) {
        assert.equal(out.includes(secret), false, 'leaked ' + secret + ' in: ' + out);
    }
    assert.ok(out.includes('bob'), 'non-sensitive fields must survive: ' + out);
    assert.ok(out.includes('/home/user'), 'paths must survive: ' + out);
});

test('key matching ignores separators and case', () => {
    for (const key of ['loginToken', 'login_token', 'LOGIN-TOKEN', 'Token']) {
        const out = render([{ [key]: 'LEAKME' }]);
        assert.equal(out.includes('LEAKME'), false, key + ' was not redacted: ' + out);
    }
});

test('free-form strings are scrubbed at warn/error level too', () => {
    const out = render(['request failed: loginToken=abc123, token: XYZ']);
    assert.equal(out.includes('abc123'), false, out);
    assert.equal(out.includes('XYZ'), false, out);
    assert.ok(out.includes('request failed'), out);
});

test('the former ReferenceError branch now returns instead of throwing', () => {
    // verbose() used to call redactString(), which was never defined. The
    // ReferenceError was swallowed by the outer catch and produced nothing.
    const err = new Error('boom');
    const out = render([{ error: err }]);
    assert.ok(out.includes('boom'), 'expected the error message, got: ' + out);
});

test('ordinary logs are not damaged by redaction', () => {
    const out = render(['编译完成，用时 1234ms'], 'info');
    assert.equal(out, '编译完成，用时 1234ms');
    const obj = render([{ filePath: 'C:\\a\\b.cpp', durationMs: 1234 }], 'info');
    assert.ok(obj.includes('b.cpp'), obj);
    assert.ok(obj.includes('1234'), obj);
});
