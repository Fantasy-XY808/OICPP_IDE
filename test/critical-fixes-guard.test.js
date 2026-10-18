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
const rendererMainJs = read('src/renderer/js/main.js');
const rendererIndex = read('src/renderer/index.html');
const monacoManagerJs = read('src/renderer/js/monaco-editor-manager.js');
const compileManagerJs = read('src/renderer/js/compile-manager.js');
const tabsJs = read('src/renderer/js/tabs.js');
const fileExplorerJs = read('src/renderer/js/sidebar/fileExplorer.js');
const editorSettingsJs = read('src/renderer/settings/editor.js');
const editorSettingsHtml = read('src/renderer/settings/editor.html');

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

test('editor typing, compiler output, and workspace tree avoid disruptive side effects', () => {
    assert.match(monacoManagerJs, /formatOnType:\s*false/);
    assert.match(monacoManagerJs, /lineNumbersMinChars:\s*1/);
    assert.match(monacoManagerJs, /lineDecorationsWidth:\s*0/);
    assert.match(compileManagerJs, /if \(options\.forDebug\)[\s\S]*?compilerArgs = compilerArgs \+ ' -g'/);
    assert.doesNotMatch(
        compileManagerJs.slice(
            compileManagerJs.indexOf('if (options.forDebug)'),
            compileManagerJs.indexOf('const compileCommand')
        ),
        /else\s*\{\s*if \(!compilerArgs\.includes\('-g'\)\)/
    );
    assert.match(mainJs, /path\.join\(\s*app\.getPath\('userData'\),\s*'compile-cache'/);
    assert.match(mainJs, /endsWith\('\.oicpp-cache'\)/);
    assert.match(mainJs, /fs\.watch\([\s\S]*?workspace-directory-changed/);
    assert.match(preloadJs, /onWorkspaceDirectoryChanged/);
    assert.match(fileExplorerJs, /onWorkspaceDirectoryChanged/);
    assert.match(fileExplorerJs, /this\.loadWorkspaceFiles\(\)/);
    assert.match(fileExplorerJs, /file\.extension.*=== '\.exe'/);
    const autoSave = tabsJs.slice(tabsJs.indexOf('async autoSaveModifiedTabs'), tabsJs.indexOf('closeAllTabs'));
    assert.doesNotMatch(autoSave, /formatCode/);
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

test('first-run defaults enable tab formatting, format-on-save, and translucent glass', () => {
    assert.match(mainJs, /formatterIndentStyle:\s*'tabs'/);
    assert.match(mainJs, /formatOnSave:\s*true/);
    assert.match(mainJs, /windowOpacity:\s*0\.95/);
    assert.match(mainJs, /glassEffectEnabled:\s*true/);
    assert.match(mainJs, /UseTab:\s*'Always'/);
    assert.match(mainJs, /onboardingCompleted:\s*false/);
    assert.match(mainJs, /wordWrap:\s*false/);
});

test('onboarding gates the editor until setup and previews settings live without a skip action', () => {
    const html = read('src/renderer/index.html');
    const onboarding = read('src/renderer/js/onboarding.js');
    const init = read('src/renderer/js/init.js');
    assert.match(html, /class="startup-pending"/);
    assert.match(html, /onboarding\.bundle\.js/);
    assert.match(html, /onboarding-background/);
    assert.doesNotMatch(html, /onboarding-skip/);
    assert.match(onboarding, /sendSettingsPreview/);
    assert.match(onboarding, /onboardingCompleted: true/);
    assert.match(init, /await window\.onboardingManager\?\.initialize/);
    assert.ok(init.indexOf('await window.onboardingManager?.initialize') < init.indexOf('initializeApp();'));
    assert.match(mainJs, /previewSettings\?\.windowOpacity[\s\S]*mainWindow\.setOpacity/);
    assert.doesNotMatch(read('src/lang/zh-cn.json'), /稍后设置/);
    assert.doesNotMatch(read('src/lang/en.json'), /Set up later/);
});

test('onboarding imports and bundles the shared mesh-gradient renderer', () => {
    const onboarding = read('src/renderer/js/onboarding.js');
    const onboardingCss = read('src/renderer/css/onboarding.css');
    const html = read('src/renderer/index.html');
    const packageJson = JSON.parse(read('package.json'));
    assert.match(onboarding, /@applemusic-like-lyrics\/core/);
    assert.match(onboarding, /MeshGradientRenderer/);
    assert.match(onboarding, /setStaticMode\(false\)/);
    assert.match(onboarding, /setFlowSpeed\(4\)/);
    assert.match(onboarding, /setRenderScale\(0\.65\)/);
    assert.match(onboarding, /TabWidth: Number/);
    assert.match(html, /data-onboarding-step="3"/);
    assert.match(html, /onboarding-font-size/);
    assert.match(html, /onboarding-auto-save/);
    const backgroundSetup = onboarding.slice(
        onboarding.indexOf('async startBackground'),
        onboarding.indexOf('\n    disposeBackground() {')
    );
    assert.ok(
        backgroundSetup.indexOf('await renderer.setAlbum(album, false)') < backgroundSetup.indexOf('renderer.resume();')
    );
    assert.match(onboarding, /this\.background\.pause\(\)/);
    assert.doesNotMatch(onboarding, /addEventListener\(['"]blur['"]/);
    assert.doesNotMatch(onboarding, /is-background-suspended/);
    assert.match(onboardingCss, /opacity 720ms/);
    assert.match(onboardingCss, /brightness\(1\.12\) saturate\(1\.25\) contrast\(1\.08\)/);
    assert.match(onboardingCss, /close-btn svg/);
    assert.match(onboardingCss, /appearance:\s*none/);
    assert.match(onboardingCss, /rgba\(24, 26, 33, 0\.96\)/);
    assert.doesNotMatch(onboardingCss, /box-shadow:\s*0 0 12px/);
    assert.match(packageJson.scripts.prestart, /prebuild:onboarding/);
    assert.match(packageJson.scripts.predev, /prebuild:onboarding/);
    assert.match(packageJson.scripts.build, /prebuild:onboarding/);
    assert.match(packageJson.scripts.build, /prebuild:compiler/);
    assert.doesNotMatch(JSON.stringify(packageJson.scripts), /prebuild:soto-background/);
});

test('first-run opacity does not fade the onboarding interface', () => {
    assert.match(mainJs, /settings\.onboardingCompleted === false \? 1/);
    const previewHandler = mainJs.slice(
        mainJs.indexOf("ipcMain.on('settings-preview'"),
        mainJs.indexOf("ipcMain.handle('consume-startup-workspace-to-open'")
    );
    assert.match(previewHandler, /settings\.onboardingCompleted !== false/);
});

test('clangd-only capabilities are respected and semicolons do not trigger formatting', () => {
    assert.match(monacoManagerJs, /!serverCapabilities\?\.codeLensProvider/);
    assert.match(monacoManagerJs, /autoFormatTriggerCharacters:\s*\['\}', '\)'\]/);
    assert.match(monacoManagerJs, /if \(ch === ';'\) return \[\]/);
});

test('Windows toolchain bundle includes GDB for the built-in debugger', () => {
    const compilerScript = read('scripts/prepare-compiler.js');
    const releaseWorkflow = read('.github/workflows/build.yml');
    const compilerWorkflow = read('.github/workflows/build-windows-test.yml');
    assert.match(compilerScript, /'gdb\.exe'/);
    assert.match(compilerScript, /REQUIRED_BIN_EXES = \['g\+\+\.exe', 'gdb\.exe'\]/);
    assert.match(compilerScript, /if \(\/\\\.dll\$\/i\.test\(name\)\)/);
    assert.match(compilerScript, /MSYS2 UCRT64 工具链不完整/);
    assert.match(compilerScript, /share', 'gdb/);
    assert.match(compilerScript, /python\\d\+\\\.\\d\+/);
    assert.match(releaseWorkflow, /mingw-w64-ucrt-x86_64-gdb/);
    assert.match(compilerWorkflow, /mingw-w64-ucrt-x86_64-gdb/);
    assert.match(releaseWorkflow, /Verify bundled GCC and GDB/);
    assert.match(compilerWorkflow, /Verify bundled GCC and GDB/);
    assert.match(releaseWorkflow, /Verify packaged GCC and GDB/);
    assert.match(compilerWorkflow, /Verify packaged GCC and GDB/);
    assert.match(releaseWorkflow, /--sysroot=\$toolchainRoot/);
    assert.match(compilerWorkflow, /--sysroot=\$toolchainRoot/);
    assert.match(releaseWorkflow, /Bundled g\+\+ failed to compile the smoke test/);
    assert.match(compilerWorkflow, /Bundled g\+\+ failed to compile the smoke test/);
    assert.match(mainJs, /function getBundledGdbPath\(\)/);
    assert.match(mainJs, /path\.join\('compiler', 'bin', 'g\+\+\.exe'\)/);
    assert.match(mainJs, /path\.join\('compiler', 'bin', 'gdb\.exe'\)/);
    assert.match(mainJs, /gdbPath: bundledGdbPath \|\| debuggerConfig\.command/);
    assert.match(mainJs, /gdbEnv\.PYTHONHOME = bundledToolchainRoot/);
    assert.match(mainJs, /gdbDataDirectory: path\.join\(bundledToolchainRoot, 'share', 'gdb'\)/);
    assert.match(read('src/gdb-debugger.js'), /--data-directory=\$\{options\.gdbDataDirectory\}/);
});

test('compile-and-run compiles through IPC without exposing shell wrapper commands', () => {
    assert.match(compileManagerJs, /ipcRenderer\.invoke\('compile-file'/);
    assert.match(compileManagerJs, /await this\.ensureRunTerminal\(this\.getWorkingDirectory\(inputFile\)\)/);
    const compileFlow = compileManagerJs.slice(
        compileManagerJs.indexOf('async compileCurrentFile'),
        compileManagerJs.indexOf('async cloudCompileCurrentFile')
    );
    assert.doesNotMatch(compileFlow, /cmd \/c/);
    assert.doesNotMatch(compileFlow, /Clear-Host/);
    assert.match(mainJs, /getBundledCompilerSysroot\(compilerPath\)/);
    assert.match(mainJs, /sysroot \? \[`--sysroot=\$\{sysroot\}`\]/);
});

test('autosave is a per-file after-delay save without rewriting code during idle saves', () => {
    assert.match(rendererMainJs, /timers: new Map\(\)/);
    assert.match(rendererMainJs, /setTimeout\(\(\) => this\.handleAutoSaveTick\(filePath\), ctrl\.debounceMs\)/);
    assert.match(rendererMainJs, /performAutoSave\(filePath\)/);
    assert.match(tabsJs, /async autoSaveModifiedTabs\(filePath = null\)/);
    assert.match(tabsJs, /normalizePath\(tabData\.filePath\) === requestedPath/);
    const autoSave = tabsJs.slice(tabsJs.indexOf('async autoSaveModifiedTabs'), tabsJs.indexOf('closeAllTabs'));
    assert.doesNotMatch(autoSave, /formatCode/);
    assert.match(rendererMainJs, /this\.settings && this\.settings\.formatOnSave/);
    assert.match(rendererMainJs, /if \(enabled && window\.tabManager\?\.tabs\?\.values\)/);
    assert.match(rendererMainJs, /if \(tabData\?\.modified && !tabData\.isTempFile/);
    assert.match(tabsJs, /this\.triggerAutoSaveForTab\(tabData\)/);
    assert.match(tabsJs, /markTabAsModifiedByUniqueKey[\s\S]{0,260}this\.triggerAutoSaveForTab\(tabData\)/);
    assert.match(editorSettingsJs, /autoSaveInterval: 1000/);
    assert.match(editorSettingsHtml, /id="editor-auto-save-interval" min="1" max="3600" value="1"/);
});

test('editor surface follows VS Code focus and rounded-frame behavior', () => {
    const modernCss = read('src/renderer/css/modern.css');
    const editorCss = read('src/renderer/css/editor.css');
    const monacoManagerJs = read('src/renderer/js/monaco-editor-manager.js');
    assert.match(modernCss, /body:has\(> \.main-container\) \{\s*display: flex;[\s\S]*padding: 6px;[\s\S]*gap: 6px;/);
    assert.match(
        modernCss,
        /body:has\(> \.main-container\) \.editor-container \{\s*border: 1px solid var\(--editor-surface-border\);[\s\S]*border-radius: var\(--radius-md\);[\s\S]*overflow: hidden;/
    );
    assert.match(modernCss, /--editor-surface-border: color-mix\(in srgb, var\(--text-color\) 12%, transparent\);/);
    assert.match(
        modernCss,
        /body:has\(> \.main-container\) :is\(\.editor-group, \.editor-area, \.monaco-editor-container\) \{\s*border: 0;[\s\S]*outline: none;/
    );
    assert.match(
        modernCss,
        /body \.sidebar-panel \{\s*border: 1px solid var\(--panel-border\);[\s\S]*border-radius: var\(--radius-md\);/
    );
    assert.match(
        modernCss,
        /body:has\(> \.main-container\) :is\(\.integrated-terminal-panel\) \{\s*border: 1px solid var\(--panel-border\);[\s\S]*border-radius: var\(--radius-md\);/
    );
    assert.match(modernCss, /body \.editor-layout \{\s*gap: 6px;/);
    assert.match(editorCss, /\.editor-group \+ \.editor-group \{\s*border-left: 0/);
    assert.match(modernCss, /body \.tab \{\s*height: 35px;[\s\S]*border-radius: var\(--radius-xs\) !important/);
    assert.match(modernCss, /body \.tab\.active \{[\s\S]*box-shadow: none;/);
    assert.match(modernCss, /body \.editor-group-resizer::after \{[\s\S]*opacity: 0/);
    assert.match(
        modernCss,
        /body:has\(> \.main-container\) \.editor-area \.monaco-editor \{\s*outline: none !important;/
    );
    assert.match(monacoManagerJs, /'editor\.lineHighlightBorder': '#00000000'/);
});

test('compiler settings do not expose manual compiler path management', () => {
    const compilerHtml = read('src/renderer/settings/compiler.html');
    const compilerJs = read('src/renderer/settings/compiler.js');
    const packageJson = JSON.parse(read('package.json'));
    const buildWorkflow = read('.github/workflows/build.yml');
    assert.doesNotMatch(compilerHtml, /compiler-path|browse-compiler|install-compiler/);
    assert.doesNotMatch(compilerJs, /browseCompiler|setCompilerPath|downloadCompiler/);
    assert.match(compilerHtml, /compiler-runtime-status/);
    assert.match(mainJs, /settings\.compilerPath = bundledCompilerPath/);
    assert.match(packageJson.scripts.build, /prebuild:compiler/);
    assert.match(buildWorkflow, /Setup MSYS2 UCRT64 compiler/);
});

test('existing settings profiles do not unexpectedly show first-run onboarding', () => {
    assert.match(mainJs, /savedSettings\.onboardingCompleted === undefined/);
    assert.match(mainJs, /settings\.onboardingCompleted = true/);
    assert.match(read('src/renderer/js/onboarding.js'), /settings\.onboardingCompleted !== false/);
});

test('code stress testing is not gated on account login', () => {
    assert.doesNotMatch(rendererIndex, /no-login-message|compare-login-btn/);
    assert.doesNotMatch(rendererMainJs, /noLoginMsg|compareLoginBtn/);
});

test('Monaco on-type formatting uses the supported API and checks availability', () => {
    assert.match(monacoManagerJs, /registerOnTypeFormattingEditProvider/);
    assert.match(monacoManagerJs, /typeof registerProvider !== 'function'/);
    assert.match(monacoManagerJs, /updateOptions\.insertSpaces = this\.clangFormatStyle\.UseTab === 'Never'/);
    assert.doesNotMatch(monacoManagerJs, /registerOnTypeFormattingProvider/);
});

test('expected missing sample config files are not logged as errors', () => {
    const start = mainJs.indexOf("ipcMain.handle('check-file-exists'");
    assert.ok(start >= 0, 'check-file-exists handler not found');
    const handler = mainJs.slice(start, mainJs.indexOf("ipcMain.handle('path-join'", start));
    assert.match(handler, /error\?\.code === 'ENOENT'/);
    assert.doesNotMatch(handler, /logInfo\(.*文件不存在/);
});
