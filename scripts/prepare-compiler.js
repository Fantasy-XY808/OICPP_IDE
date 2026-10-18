// 从本机 MSYS2 UCRT64 精简提取 MinGW-w64 工具链到 build/compiler/win32，
// 供 electron-builder extraResources 打包进安装包（自包含编译器，Dev-C++ 模式）。
// 用法: node scripts/prepare-compiler.js
// 仅本地/CI 打包时运行，不参与应用运行时。
const fs = require('fs');
const path = require('path');

const SRC = process.env.MSYS2_PREFIX || 'C:/msys64/ucrt64';
const DEST = path.join(__dirname, '..', 'build', 'compiler', 'win32');

// bin 里的 GCC/GDB 工具；DLL 全量复制以覆盖 MSYS2 滚动更新后的依赖名称。
const BIN_EXES = [
    'cpp.exe',
    'gcc.exe',
    'g++.exe',
    'c++.exe',
    'c++filt.exe',
    'as.exe',
    'ld.exe',
    'ld.bfd.exe',
    'gdb.exe',
];
const REQUIRED_BIN_EXES = ['g++.exe', 'gdb.exe'];
const PYTHON_EXCLUDED_DIRS = new Set([
    '__pycache__',
    'ensurepip',
    'idlelib',
    'pydoc_data',
    'test',
    'tests',
    'tkinter',
    'turtledemo',
]);

// lib 根下的导入库：排除 UWP/驱动开发用的大块非必需项
const LIB_A_EXCLUDE = [
    /^libcrypto\./i,
    /^libssl\./i,
    /^libonecore/i,
    /^libwindowscoreheadless/i,
    /^libnanosrv/i,
    /^libmincore/i,
    /^libwsmsvc/i,
    /^libwindowsapp/i,
    /^libapi-ms-win/i,
];

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

function copyTree(src, dest, filterFn) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            if (!filterFn || filterFn(s, entry.name, true)) {
                copyTree(s, d, filterFn, true);
            }
        } else if (!filterFn || filterFn(s, entry.name)) {
            fs.copyFileSync(s, d);
        }
    }
}

function main() {
    if (process.platform !== 'win32') {
        console.log('跳过 Windows 内置编译器准备: 当前构建平台为', process.platform);
        return;
    }

    const binSrc = path.join(SRC, 'bin');
    const missingExecutables = REQUIRED_BIN_EXES.filter((name) => !fs.existsSync(path.join(binSrc, name)));
    const gccLibDir = path.join(SRC, 'lib', 'gcc', 'x86_64-w64-mingw32');
    const gccVersions = fs.existsSync(gccLibDir)
        ? fs
              .readdirSync(gccLibDir, { withFileTypes: true })
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name)
              .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
        : [];
    const pythonLibRoot = path.join(SRC, 'lib');
    const pythonLibDirs = fs.existsSync(pythonLibRoot)
        ? fs
              .readdirSync(pythonLibRoot, { withFileTypes: true })
              .filter((entry) => entry.isDirectory() && /^python\d+\.\d+$/.test(entry.name))
              .map((entry) => entry.name)
              .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
        : [];
    const pythonLibName = pythonLibDirs[0];
    const pythonLib = pythonLibName ? path.join(pythonLibRoot, pythonLibName) : '';
    const missingRuntimePaths = [
        !fs.existsSync(path.join(SRC, 'share', 'gdb')) && 'share/gdb',
        (!pythonLib || !fs.existsSync(path.join(pythonLib, 'encodings', '__init__.py'))) && 'lib/pythonX.Y/encodings',
        !fs.existsSync(path.join(SRC, 'include', 'ctype.h')) && 'include/ctype.h',
        !fs.existsSync(path.join(SRC, 'include', 'c++', gccVersions[0], 'bits', 'stdc++.h')) &&
            'include/c++/GCC_VERSION/bits/stdc++.h',
    ].filter(Boolean);

    if (missingExecutables.length || gccVersions.length === 0 || missingRuntimePaths.length > 0) {
        console.error('MSYS2 UCRT64 工具链不完整:', SRC);
        if (missingExecutables.length) {
            console.error('缺少:', missingExecutables.join(', '));
        }
        if (gccVersions.length === 0) {
            console.error('未找到 GCC 私有工具目录:', gccLibDir);
        }
        if (missingRuntimePaths.length > 0) {
            console.error('缺少 GDB 运行时文件:', missingRuntimePaths.join(', '));
        }
        console.error('请在 MSYS2 UCRT64 中成功安装 GCC 和 GDB 后重试。');
        process.exit(1);
    }

    console.log('清理旧目录:', DEST);
    try {
        fs.rmSync(DEST, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
    } catch (err) {
        console.warn('清理失败(继续,将覆盖写入):', err.message);
    }
    ensureDir(DEST);

    // 1) bin: 编译驱动 + 依赖 DLL
    const binDest = path.join(DEST, 'bin');
    for (const name of BIN_EXES) {
        const s = path.join(binSrc, name);
        if (fs.existsSync(s)) copyFile(s, path.join(binDest, name));
        else console.warn('  [warn] 缺少', name);
    }
    for (const name of fs.readdirSync(binSrc)) {
        if (/\.dll$/i.test(name)) {
            copyFile(path.join(binSrc, name), path.join(binDest, name));
        }
    }

    // 2) gcc 私有目录: cc1/cc1plus/collect2 + 静态库 + gcc 自带头文件
    const ver = gccVersions[0];
    copyTree(path.join(gccLibDir, ver), path.join(DEST, 'lib', 'gcc', 'x86_64-w64-mingw32', ver), (_src, name) => {
        return name !== 'install-tools' && name !== 'plugin';
    });

    // 3) mingw-w64 CRT (include + lib)
    copyTree(path.join(SRC, 'x86_64-w64-mingw32'), path.join(DEST, 'x86_64-w64-mingw32'));

    // 4) C/C++ 标准库与系统头文件
    copyTree(path.join(SRC, 'include'), path.join(DEST, 'include'));

    // 5) GDB data files and Python runtime required by its embedded Python.
    copyTree(path.join(SRC, 'share', 'gdb'), path.join(DEST, 'share', 'gdb'));
    copyTree(pythonLib, path.join(DEST, 'lib', pythonLibName), (_src, name, isDirectory) =>
        isDirectory ? !PYTHON_EXCLUDED_DIRS.has(name) : !name.endsWith('.pyc') && !name.endsWith('.pyo')
    );

    // 6) Windows API 导入库 + 启动对象 (crt2.o / default-manifest.o 等)
    const libSrc = path.join(SRC, 'lib');
    for (const entry of fs.readdirSync(libSrc, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const lower = entry.name.toLowerCase();
        if (!lower.endsWith('.a') && !lower.endsWith('.o')) continue;
        if (LIB_A_EXCLUDE.some((re) => re.test(entry.name))) continue;
        copyFile(path.join(libSrc, entry.name), path.join(DEST, 'lib', entry.name));
    }

    // 记录来源与版本
    fs.writeFileSync(
        path.join(DEST, 'COMPILER_INFO.txt'),
        `OICPP 内置编译器运行时\n来源: ${SRC}\n版本: GCC ${ver}\n生成时间: ${new Date().toISOString()}\n`
    );

    console.log('完成:', DEST);
}

main();
