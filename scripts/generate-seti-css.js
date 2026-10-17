// 从 vs-seti-icon-theme.json 生成 seti.css（码点 + 官方配色）。
// 仅本地开发工具，不参与运行时。
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'fonts', 'vs-seti-icon-theme.json');
const d = require(jsonPath);
const defs = d.iconDefinitions;

let out = '/* ============================================================\n';
out += ' * seti.css - Seti 文件图标主题（取自 microsoft/vscode 仓库\n';
out += ' * extensions/theme-seti，MIT License，码点由 vs-seti-icon-theme.json 生成）\n';
out += ' * ============================================================ */\n\n';
out +=
    '@font-face {\n    font-family: "seti";\n    src: url("./seti.woff") format("woff");\n    font-display: block;\n}\n\n';
out +=
    '.seti {\n    font-family: "seti";\n    font-weight: normal;\n    font-style: normal;\n    display: inline-block;\n    line-height: 1;\n    text-rendering: auto;\n    -webkit-font-smoothing: antialiased;\n}\n\n';

let count = 0;
for (const [name, def] of Object.entries(defs)) {
    if (name.endsWith('_light')) continue;
    // fontCharacter 形如 "\E01A"（JSON 解码后为 \E01A）
    const fc = String(def.fontCharacter || '');
    if (!fc) continue;
    out +=
        '.seti-' + name.slice(1) + '::before { content: "' + fc + '"; color: ' + (def.fontColor || '#d4d7d6') + '; }\n';
    count++;
}

const dest = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'fonts', 'seti.css');
fs.writeFileSync(dest, out);
console.log('生成 seti.css,', count, '个图标定义');
