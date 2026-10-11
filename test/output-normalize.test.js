'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeForVerdict,
    normalizeForDisplay,
    verdictsMatch,
    findDifference
} = require('../src/renderer/js/shared/output-normalize.js');

// ---------------------------------------------------------------------------
// Reference oracles.
//
// These are verbatim copies of the implementations that shipped in
// sampleTester.js and codeComparer.js. They are the specification: if the
// shared module ever disagrees with them, a judgement has silently changed,
// and these tests must fail.
//
// (deliberately not deduped -- duplicating them is the point)
// ---------------------------------------------------------------------------

function legacySampleTesterCompareOutput(actual, expected) {
    const normalize = (str) => {
        return String(str || '').replace(/\r\n?/g, '\n').split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n+$/, '');
    };
    return normalize(actual || '') === normalize(expected || '') ? 'AC' : 'WA';
}

function legacyCodeComparerCompareOutputs(output1, output2) {
    const normalize = (str) => {
        return str.split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n+$/, '');
    };
    return normalize(output1 || '') === normalize(output2 || '');
}

function legacyCodeComparerNormalizeForDisplay(text) {
    if (text == null) return '';
    let s = String(text);
    s = s.replace(/^\uFEFF/, '');
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    s = s.replace(/\uFEFF/g, '');
    return s;
}

// Corpus chosen to hit every branch the legacy normalizers can take.
const CORPUS = [
    '',
    '42',
    '42\n',
    '42\n\n\n',
    '42\r\n',
    '42\r\n7',
    '42\r7',
    'a\nb\nc',
    'a\r\nb\r\nc',
    'a \n b\n',
    'a   \nb\t\t\n',
    '  leading kept',
    '\n\nleading blank lines kept\n\n',
    'tab\there',
    '\u00e4\u00b8\u00e6\u4e2d\u6587',
    '\u00a0nbsp\u00a0',
    'line1   \nline2\t\nline3',
    'x'.repeat(5000)
];

test('normalizeForVerdict matches the legacy sample tester verdict basis', () => {
    for (const text of CORPUS) {
        // the legacy compareOutput normalized exactly this way internally
        const expected = String(text || '').replace(/\r\n?/g, '\n').split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n+$/, '');
        assert.equal(normalizeForVerdict(text), expected, 'input: ' + JSON.stringify(text));
    }
});

const hasLoneCarriageReturn = (text) => /\r(?!\n)/.test(String(text || ''));

test('verdictsMatch reproduces the sample tester verdict exactly, on every input', () => {
    for (const actual of CORPUS) {
        for (const expected of CORPUS) {
            assert.equal(
                verdictsMatch(actual, expected),
                legacySampleTesterCompareOutput(actual, expected) === 'AC',
                'sample tester verdict changed for ' + JSON.stringify([actual, expected])
            );
        }
    }
});

test('verdictsMatch reproduces the code comparer verdict wherever it had no lone-CR gap', () => {
    for (const actual of CORPUS) {
        for (const expected of CORPUS) {
            if (hasLoneCarriageReturn(actual) || hasLoneCarriageReturn(expected)) continue;
            assert.equal(
                verdictsMatch(actual, expected),
                legacyCodeComparerCompareOutputs(actual, expected),
                'code comparer verdict changed for ' + JSON.stringify([actual, expected])
            );
        }
    }
});

test('the legacy comparators disagreed on a lone CR, and we keep the tester semantics', () => {
    // Regression record, not a wish.
    //
    // The two shipped comparators were NOT equivalent. sampleTester
    // normalised \r\n? to \n before splitting lines; codeComparer did not, so
    // a lone CR sitting inside a line survived as data for the comparer but
    // became a line break for the tester. Identical output, two verdicts.
    assert.equal(legacySampleTesterCompareOutput('42\r7', '42\n7'), 'AC');
    assert.equal(legacyCodeComparerCompareOutputs('42\r7', '42\n7'), false);

    // The unified basis follows the sample tester: it matches Python's
    // universal newlines and is the more complete of the two.
    assert.ok(verdictsMatch('42\r7', '42\n7'));

    // Outside lone-CR inputs the two legacy comparators did agree.
    for (const a of CORPUS) {
        for (const b of CORPUS) {
            if (hasLoneCarriageReturn(a) || hasLoneCarriageReturn(b)) continue;
            assert.equal(
                legacySampleTesterCompareOutput(a, b) === 'AC',
                legacyCodeComparerCompareOutputs(a, b),
                'unexpected divergence for ' + JSON.stringify([a, b])
            );
        }
    }
});

test('normalizeForDisplay matches the legacy code comparer display basis', () => {
    const displayCorpus = CORPUS.concat([
        '\uFEFFwith bom',
        'bom\uFEFFinside',
        '\uFEFF'
    ]);
    for (const text of displayCorpus) {
        assert.equal(
            normalizeForDisplay(text),
            legacyCodeComparerNormalizeForDisplay(text),
            'input: ' + JSON.stringify(text)
        );
    }
});

test('normalizeForDisplay deliberately keeps trailing whitespace that the verdict drops', () => {
    assert.equal(normalizeForDisplay('42   \n'), '42   \n');
    assert.equal(normalizeForVerdict('42   \n'), '42');
});

test('findDifference returns null whenever the judge would accept', () => {
    for (const actual of CORPUS) {
        for (const expected of CORPUS) {
            if (!verdictsMatch(actual, expected)) continue;
            assert.equal(
                findDifference(actual, expected),
                null,
                'accepted case still reports a difference: ' + JSON.stringify([actual, expected])
            );
        }
    }
});

test('findDifference locates a real mismatch as 1-based line and char', () => {
    assert.deepEqual(findDifference('abc', 'abd'), { line: 1, char: 3 });
    assert.deepEqual(findDifference('1\n2\n3', '1\nX\n3'), { line: 2, char: 1 });
    assert.deepEqual(findDifference('1\n2\n3', '1\n2\n33'), { line: 3, char: 2 });
});

test('findDifference tolerates a missing trailing line', () => {
    assert.deepEqual(findDifference('1\n2', '1\n2\n3'), { line: 3, char: 1 });
});

test('verdictsMatch ignores trailing whitespace but not inner whitespace', () => {
    assert.ok(verdictsMatch('1 2 3', '1 2 3'));
    assert.ok(!verdictsMatch('1  2  3', '1 2 3'), 'inner spacing is significant to a judge');
    assert.ok(verdictsMatch('1 2 3   ', '1 2 3'));
    assert.ok(verdictsMatch('1 2 3\r\n', '1 2 3'));
});

test('empty and missing output are treated as equal', () => {
    assert.ok(verdictsMatch('', ''));
    assert.ok(verdictsMatch(null, undefined));
    assert.ok(verdictsMatch(null, ''));
    assert.equal(findDifference('', null), null);
});
