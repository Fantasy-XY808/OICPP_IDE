const eslint = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: ['build/**', 'dist/**', 'examples/**', 'node_modules/**', 'src/renderer/js/*.bundle.js'],
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: globals.node,
        },
        rules: {
            ...eslint.configs.recommended.rules,
            'no-control-regex': 'off',
            'no-empty': 'off',
            'no-unused-vars': 'off',
            'no-useless-catch': 'off',
            'no-useless-escape': 'off',
        },
    },
    {
        files: ['src/main.js'],
        languageOptions: {
            globals: {
                logInfo: 'readonly',
                logWarn: 'readonly',
                logError: 'readonly',
            },
        },
    },
    {
        files: ['src/preload.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
    },
    {
        files: ['src/utils/font-detector.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                logInfo: 'readonly',
                logWarn: 'readonly',
            },
        },
    },
    {
        files: ['src/utils/multi-thread-downloader.js'],
        languageOptions: {
            globals: {
                logInfo: 'readonly',
                logWarn: 'readonly',
                logError: 'readonly',
            },
        },
    },
    {
        files: ['src/renderer/**/*.js'],
        languageOptions: {
            sourceType: 'script',
        },
        rules: {
            'no-undef': 'off',
        },
    },
    {
        files: ['src/renderer/js/onboarding.js'],
        languageOptions: {
            sourceType: 'module',
        },
    },
    {
        files: ['scripts/**/*.js', 'scripts/**/*.mjs', 'test/**/*.js'],
        ...eslint.configs.recommended,
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
        rules: {
            'no-unused-vars': 'off',
        },
    },
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
        rules: {
            'no-unused-vars': 'off',
        },
    },
];
