/**
 * Shared output-normalization primitives for the judging pipeline.
 *
 * The sample tester and the code comparer each used to carry a private copy of
 * these rules. The copies drifted: the sample tester judged AC on trailing
 * whitespace differences while its difference locator compared strictly, so an
 * accepted case could still be highlighted as "different".
 *
 * This module is deliberately loaded two ways:
 *   - as a plain <script> in the renderer, attaching window.OICPPOutputNormalize
 *   - as a CommonJS module from node:test
 *
 * Verdict semantics are byte-for-byte what the two tools already shipped, so
 * callers can be migrated without changing any judgement.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.OICPPOutputNormalize = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function unifyNewlines(text) {
        return String(text).replace(/\r\n?/g, '\n');
    }

    function stripBom(text) {
        return text.replace(/^\uFEFF/, '').replace(/\uFEFF/g, '');
    }

    /**
     * Basis for the AC/WA decision: newlines unified, trailing whitespace on
     * every line dropped, trailing blank lines dropped.
     *
     * Whitespace *inside* a line stays significant -- competitive judges are
     * token-based inside a line, and collapsing it would accept wrong answers.
     */
    function normalizeForVerdict(text) {
        if (!text) return '';
        return unifyNewlines(text)
            .split('\n')
            .map(function (line) { return line.trimEnd(); })
            .join('\n')
            .replace(/\n+$/, '');
    }

    /**
     * True when two outputs are equivalent under verdict semantics.
     */
    function verdictsMatch(actual, expected) {
        return normalizeForVerdict(actual) === normalizeForVerdict(expected);
    }

    /**
     * Basis for side-by-side diff highlighting: BOM removed and newlines
     * unified, nothing else. Unlike normalizeForVerdict this keeps trailing
     * whitespace visible, because a textual diff is allowed to show it.
     *
     * Callers that need to agree with the AC/WA decision must use
     * normalizeForVerdict / findDifference instead.
     */
    function normalizeForDisplay(text) {
        if (text == null) return '';
        return stripBom(unifyNewlines(text));
    }

    /**
     * 1-based {line, char} of the first difference under verdict semantics, or
     * null when the two outputs are equivalent.
     *
     * Must stay consistent with normalizeForVerdict: if this reported a
     * difference for a case the judge accepted, the UI would contradict itself.
     */
    function findDifference(actual, expected) {
        const actualLines = normalizeForVerdict(actual).split('\n');
        const expectedLines = normalizeForVerdict(expected).split('\n');
        const lineCount = Math.max(actualLines.length, expectedLines.length);

        for (let i = 0; i < lineCount; i++) {
            const actualLine = actualLines[i] || '';
            const expectedLine = expectedLines[i] || '';
            if (actualLine === expectedLine) continue;

            const minLength = Math.min(actualLine.length, expectedLine.length);
            let offset = 0;
            while (offset < minLength && actualLine[offset] === expectedLine[offset]) {
                offset++;
            }
            return { line: i + 1, char: offset + 1 };
        }

        return null;
    }

    return {
        normalizeForVerdict: normalizeForVerdict,
        normalizeForDisplay: normalizeForDisplay,
        verdictsMatch: verdictsMatch,
        findDifference: findDifference
    };
});
