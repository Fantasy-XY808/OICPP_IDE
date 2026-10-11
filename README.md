<h1 align="center">
  <img src="oicpp.ico" alt="OICPP IDE" width="64" height="64" align="top" />
  OICPP IDE
</h1>

<p align="center">
  <strong>面向信息学竞赛(OI)选手的开箱即用 C++ 集成开发环境</strong>
</p>

<p align="center">
  <a href="https://github.com/Fantasy-XY808/OICPP_IDE/stargazers"><img src="https://img.shields.io/github/stars/Fantasy-XY808/OICPP_IDE.svg?style=for-the-badge&color=yellow" alt="Stars" /></a>
  <a href="https://github.com/Fantasy-XY808/OICPP_IDE/issues"><img src="https://img.shields.io/github/issues/Fantasy-XY808/OICPP_IDE.svg?style=for-the-badge" alt="Issues" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Fantasy-XY808/OICPP_IDE.svg?style=for-the-badge" alt="License" /></a>
  <a href="https://github.com/Fantasy-XY808/OICPP_IDE/releases"><img src="https://img.shields.io/github/v/release/Fantasy-XY808/OICPP_IDE?style=for-the-badge&color=blue" alt="Release" /></a>
  <br />
  <img src="https://img.shields.io/badge/Version-1.0.0-0078D4?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Electron-37.2+-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Monaco_Editor-0.52+-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white" alt="Monaco Editor" />
  <img src="https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4?style=flat-square&logo=windows&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/i18n-中文_|_English-ff69b4?style=flat-square" alt="i18n" />
</p>

<p align="center">
  <a href="#-特性">✨ 特性</a> •
  <a href="#-快速开始">🚀 快速开始</a> •
  <a href="#-系统要求">💻 系统要求</a> •
  <a href="#-核心功能">🔧 核心功能</a> •
  <a href="#-快捷键">⌨️ 快捷键</a> •
  <a href="#-项目结构">📁 项目结构</a> •
  <a href="#-贡献指南">🤝 贡献指南</a> •
  <a href="#-许可证">📄 许可证</a>
</p>

---

> 本项目是 [mywwzh/oicpp](https://github.com/mywwzh/oicpp) 的社区分支 (community fork)，在原项目基础上进行了大规模 UI 现代化重构与自包含化改造。感谢原项目作者 [mywwzh](https://github.com/mywwzh) 的开创性工作。

## ✨ 特性

| 类别 | 特性 |
|------|------|
| 🎯 **零配置** | 内置 clangd 语言服务器；MinGW-w64 工具链可在设置中一键下载，或自动检测系统已安装的 MinGW/LLVM |
| 🎨 **现代界面** | Fluent / WinUI 风格悬浮圆角面板布局、Seti 彩色文件图标、codicon 图标体系、全局流畅动效 |
| 📝 **VS Code 同源编辑器** | Monaco Editor，支持彩虹括号、Inlay Hints、CodeLens、圆角选区、平滑光标滚动 |
| 🏆 **竞赛工具链** | 样例测试器、代码对拍器 (duipai)、GDB 调试、clangd 实时诊断 |
| 🖥️ **内置终端** | 集成 node-pty 终端，编译运行全程在同一界面完成，支持交互式程序 |
| 📋 **模板系统** | 内置 OI 常用模板（快读、调试宏等），支持自定义代码片段 |
| 🎨 **多主题** | Dark Modern 默认，另有 Monokai、Dracula、GitHub、Solarized 等主题 |
| 🌐 **云编译** | 支持将代码提交到 Linux 服务器进行云端编译验证 |
| 🌍 **双语界面** | 支持简体中文 / English 界面切换 |
| 📄 **PDF 阅读** | 内置 PDF 查看器，方便查看题目描述 |

## 🚀 快速开始

### 安装方式

#### 方式一：下载安装包（推荐）
从 [Releases](https://github.com/Fantasy-XY808/OICPP_IDE/releases) 页面下载最新的 Windows 安装包 (`OICPP-IDE-x.x.x-Setup.exe`)，双击安装即可。

#### 方式二：从源码运行

```bash
# 克隆仓库
git clone https://github.com/Fantasy-XY808/OICPP_IDE.git
cd OICPP_IDE

# 安装依赖
npm install

# 下载 Electron 二进制（如缺失）
node node_modules/electron/install.js

# 开发运行
npm start

# 或使用开发模式
npm run dev
```

#### 方式三：构建安装包

```bash
# 准备内置编译器（将 MinGW-w64 解压到 build/compiler/win32）
node scripts/prepare-compiler.js

# 构建 Windows 安装包
npm run build
```

## 💻 系统要求

| 项目 | 要求 |
|------|------|
| **操作系统** | Windows 10/11 (64 位) |
| **预装编译器** | 无需 —— 可在「设置 → 编译器」一键下载 MinGW-w64 工具链，或由 IDE 自动检测系统已安装的 MinGW/LLVM |
| **磁盘空间** | ~1 GB（不含按需下载的编译器工具链） |
| **内存** | 4 GB 以上推荐 |

> **注意**：安装包**内置 clangd**（`~/.oicpp/LSP`），但**不内置 MinGW-w64 编译器**——发布流水线的打包步骤不包含它。因此首次使用前需要在设置里下载一次编译器，或自行安装 MinGW-w64 / LLVM 并确保在 `PATH` 中。IDE 会自动探测常见的 MSYS2 / TDM-GCC 安装位置。

## 🔧 核心功能

### 📝 代码编辑
- **Monaco Editor**：VS Code 同款编辑器内核
- **语法高亮**：完整的 C++ 语法着色，支持自定义配色
- **智能补全**：基于 clangd LSP 的代码补全与实时诊断
- **代码格式化**：集成 Clang-Format，保存时自动格式化
- **彩虹括号**：嵌套括号以不同颜色显示
- **Sticky Scroll**：顶部吸附显示当前作用域

### ⚡ 编译运行
- **一键编译运行**：`F5` 编译并运行，输出显示在终端区域
- **内置终端模式**：编译过程实时可见，编译完成后自动清屏运行
- **弹窗模式**：程序在独立控制台窗口运行（支持交互）
- **编译缓存**：智能检测源码变化，避免重复编译

### 🧪 样例测试器
- 添加多组输入/输出样例
- 自动比对程序输出与预期输出
- 显示运行时间与内存占用
- 支持文件 I/O（freopen）和标准 I/O

### ⚖️ 代码对拍器
- 对拍验证算法正确性
- 支持 testlib 和自定义 SPJ
- 并行多线程对拍
- 实时显示对拍进度与差异

### 🐛 GDB 调试器
- 图形化断点管理
- 变量监视与调用栈查看
- 单步执行、步入/步出
- 终端内交互式调试

### 🌐 云编译
- 将代码提交至 Linux 服务器编译
- 适用于验证跨平台兼容性
- 排队状态实时显示

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
> 以下为**出厂默认值**，全部可在「设置 → 快捷键」中自定义。

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建文件 |
| `Ctrl+Shift+N` | 新建临时文件 |
| `Ctrl+K` | 打开文件夹 |
| `Ctrl+S` | 保存文件 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+W` | 关闭当前标签 |
| `F9` | 仅编译 |
| `F10` | 仅运行（需先编译） |
| `F11` | 编译并运行 |
| `F12` | 云编译 |
| `Ctrl+F11` | 运行全部样例 |
| `F5` | 开始 / 结束调试 |
| `F6` | 调试：继续 |
| `F7` | 调试：单步跳过 |
| `F8` | 调试：单步进入 |
| `Shift+F8` | 调试：单步跳出 |
| `Alt+Shift+S` | 格式化代码 |
| `F2` | 重命名符号 |
| `Ctrl+Shift+G` | 函数选择器 |
| `Ctrl+P` | 快速打开文件 |
| `Ctrl+\`` | 切换内置终端 |
| `Ctrl+B` | 切换侧边栏 |
| `Ctrl+F` | 查找 |
| `Ctrl+H` | 替换 |

## 📁 项目结构

```
OICPP_IDE/
├── .github/                    # GitHub 配置
│   ├── ISSUE_TEMPLATE/         # Issue 模板
│   ├── PULL_REQUEST_TEMPLATE.md # PR 模板
│   └── workflows/              # CI/CD 工作流
├── build/                      # 构建资源
│   ├── clangd/                 # 内置 clangd 语言服务器
│   ├── compiler/               # 内置 MinGW-w64 工具链
│   └── icons/                  # 应用图标
├── scripts/                    # 构建与工具脚本
│   ├── prepare-compiler.js     # 编译器准备脚本
│   ├── download-clangd.js      # clangd 下载脚本
│   └── generate-icons.js       # 图标生成脚本
├── src/                        # 应用源码
│   ├── lang/                   # 国际化语言文件
│   │   ├── index.js            # 主进程 i18n 模块
│   │   ├── zh-cn.json          # 简体中文翻译
│   │   └── en.json             # 英文翻译
│   ├── renderer/               # 渲染进程 (UI)
│   │   ├── assets/             # 静态资源（字体、图标）
│   │   ├── css/                # 样式表
│   │   │   └── modern.css      # 现代化 UI 覆盖层
│   │   ├── js/                 # JavaScript 模块
│   │   │   ├── formatters/     # 代码格式化
│   │   │   ├── sidebar/        # 侧栏功能面板
│   │   │   └── ui/             # UI 组件
│   │   └── settings/           # 设置窗口
│   ├── utils/                  # 工具函数
│   ├── main.js                 # Electron 主进程入口
│   ├── preload.js              # 预加载脚本
│   └── terminal-manager.js     # 集成终端管理 (node-pty)
├── CONTRIBUTING.md             # 贡献指南
├── CODE_OF_CONDUCT.md          # 行为准则
├── CHANGELOG.md                # 更新日志
├── SECURITY.md                 # 安全策略
├── LICENSE                     # AGPL-3.0 协议
├── package.json                # 项目配置
└── README.md                   # 项目说明
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细的开发设置、编码规范和提交流程。

### 贡献者

感谢所有为本项目做出贡献的开发者：

- [Fantasy-XY808](https://github.com/Fantasy-XY808) — 项目维护者，UI 现代化重构
- [mywwzh](https://github.com/mywwzh) — 上游项目 [mywwzh/oicpp](https://github.com/mywwzh/oicpp) 作者

## 📄 许可证

本项目基于 [AGPL-3.0-only](LICENSE) 协议发布。

基于 [mywwzh/oicpp](https://github.com/mywwzh/oicpp) (GPL-3.0) 修改。

### 开源软件使用声明

OICPP IDE 使用了以下开源项目：

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [Electron](https://www.electronjs.org/) | 应用框架 | MIT |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 代码编辑器 | MIT |
| [xterm.js](https://xtermjs.org/) | 终端模拟 | MIT |
| [node-pty](https://github.com/TooTallNate/node-pty) | 伪终端 | MIT |
| [clangd](https://clangd.llvm.org/) | 语言服务器 | Apache 2.0 |
| [MinGW-w64](https://www.mingw-w64.org/) | 编译器工具链 | GPL / Public Domain |
| [highlight.js](https://highlightjs.org/) | 语法高亮 | BSD-3-Clause |
| [KaTeX](https://katex.org/) | 数学公式渲染 | MIT |
| [markdown-it](https://github.com/markdown-it/markdown-it) | Markdown 解析 | MIT |
| [pdfjs-dist](https://mozilla.github.io/pdf.js/) | PDF 渲染 | Apache 2.0 |

## 🔗 链接

- 🌐 [项目主页](https://oicpp.mywwzh.top/)
- 📦 [GitHub 仓库](https://github.com/Fantasy-XY808/OICPP_IDE)
- 🐛 [问题反馈](https://github.com/Fantasy-XY808/OICPP_IDE/issues)
- 📖 [上游项目](https://github.com/mywwzh/oicpp)

---

<p align="center">
  <sub>Made with ❤️ for OI competitors</sub>
</p>