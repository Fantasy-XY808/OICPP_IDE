# Contributing to OICPP IDE

First of all, thank you for considering contributing to OICPP IDE! 🎉

OICPP IDE is an open-source, out-of-the-box C++ IDE designed for competitive programming (OI) contestants. We welcome contributions of all kinds: bug reports, feature suggestions, code improvements, documentation, and more.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Features](#suggesting-features)
    - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Conventions](#coding-conventions)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Testing](#testing)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report, please:

1. Check the [existing issues](https://github.com/Fantasy-XY808/OICPP_IDE/issues) to avoid duplicates
2. Use the **Bug Report** issue template (`.github/ISSUE_TEMPLATE/bug-反馈.yml`)
3. Include as much detail as possible:
    - OICPP IDE version (Help → About)
    - Operating system and version
    - Steps to reproduce
    - Expected vs actual behavior
    - Screenshots if applicable
    - Any relevant log output

### Suggesting Features

Feature suggestions are tracked as GitHub issues. Please:

1. Use the **Feature Request** template (`.github/ISSUE_TEMPLATE/功能建议.yml`)
2. Clearly describe the problem your feature solves
3. Explain the use case and expected behavior
4. Note if you're willing to implement it yourself

### Pull Requests

1. **Fork** the repository and create your branch from `main`
2. **Discuss** major changes in an issue first
3. **Follow** the coding conventions below
4. **Test** your changes thoroughly
5. **Update** documentation if needed
6. **Submit** a pull request with a clear description

#### PR Checklist

- [ ] Code follows project style conventions
- [ ] No new lint warnings or errors
- [ ] i18n keys added for any new user-facing strings (both `zh-cn.json` and `en.json`)
- [ ] Changes work on Windows (primary platform)
- [ ] Commit messages follow conventions

## Development Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Windows 10/11** (64-bit) — primary development platform

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Fantasy-XY808/OICPP_IDE.git
cd OICPP_IDE

# Install dependencies
npm install

# Download Electron binary (if missing)
node node_modules/electron/install.js

# Start development
npm start

# Optional: run with dev flags
npm run dev
```

### Build

```bash
# Prepare built-in compiler (optional, for packaging)
node scripts/prepare-compiler.js

# Build Windows installer
npm run build
```

## Project Structure

```
OICPP_IDE/
├── .github/                # GitHub configurations
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── workflows/          # CI/CD workflows
├── build/                  # Build resources
│   ├── clangd/            # Bundled clangd binaries
│   ├── compiler/          # Bundled MinGW-w64 toolchain
│   └── icons/             # Application icons
├── scripts/               # Build and utility scripts
├── src/                   # Application source
│   ├── lang/              # i18n language files
│   │   ├── index.js       # Main-process i18n module
│   │   ├── zh-cn.json     # Chinese (Simplified) translations
│   │   └── en.json        # English translations
│   ├── renderer/          # Renderer process (UI)
│   │   ├── css/           # Stylesheets
│   │   ├── js/            # Renderer scripts
│   │   │   ├── formatters/ # Code formatters
│   │   │   ├── sidebar/    # Sidebar panels
│   │   │   └── ui/         # UI components
│   │   ├── settings/      # Settings views and scripts
│   │   └── index.html     # Main renderer document
│   ├── utils/             # Shared utilities
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload script
│   └── terminal-manager.js # Integrated terminal (node-pty)
├── CONTRIBUTING.md        # This file
├── CODE_OF_CONDUCT.md     # Code of conduct
├── CHANGELOG.md           # Release history
├── LICENSE                # AGPL-3.0 license
├── README.md              # Project overview
├── package.json           # npm configuration
└── test/                  # Node.js unit and regression tests
```

## Coding Conventions

The repository contains three JavaScript execution environments. Keep their
module boundaries explicit; do not convert the renderer to ES modules or
CommonJS as a repository-wide style change.

### Naming and formatting

- Use `PascalCase` for classes, `camelCase` for functions and variables, and
  `UPPER_SNAKE_CASE` for module-level constants that are genuinely constant.
- Use lower-case, hyphen-separated names for new files. Keep existing file names,
  public globals, IPC channel names, persisted setting keys, and serialized
  formats stable unless a migration is explicitly designed and tested.
- Use four spaces, LF line endings, UTF-8, semicolons, and single-quoted
  JavaScript strings. `.editorconfig` and `.gitattributes` define editor and Git
  behavior; `.prettierrc.json` defines formatting and `npm run format:check`
  verifies it.
- Prefer `const`; use `let` only when reassignment is required. Do not introduce
  `var`.
- Prefer early returns and small functions with one clear responsibility.
- Do not add comments that paraphrase the next line. Explain non-obvious
  constraints, compatibility decisions, and failure handling; update or remove
  comments when behavior changes.

### Runtime and module boundaries

- `src/main.js`, `src/preload.js`, and Node-side modules use CommonJS.
- `src/renderer` is loaded through `index.html` as ordered browser scripts.
  Existing global names and script order are part of the runtime contract.
- Renderer code must call privileged Electron functionality through the
  `contextBridge` API in `src/preload.js`; do not expose `ipcRenderer` itself.
- New code should use the runtime pattern of the directory it belongs to. Avoid
  introducing a second module system or a build step when the existing runtime
  can handle the requirement.
- Keep IPC channel names and payload shapes consistent at both the preload and
  main-process ends. Validate renderer-provided values in the main process.

### Functions, errors, and compatibility

- Use `async`/`await` for asynchronous flows and propagate failures to the
  caller or report them through the project logger with useful context.
- Do not use empty `catch` blocks or success-shaped fallback values to hide
  unexpected failures. If an error is expected and intentionally ignored,
  handle only that case and document why.
- Validate paths, settings, and other data crossing process or persistence
  boundaries. Keep settings defaults, existing user data, and externally
  observable behavior compatible.
- Extract shared behavior when multiple call sites need the same logic; avoid
  speculative abstractions and unrelated rewrites.
- Keep user-visible strings in both locale files and verify their keys remain
  in parity.

### CSS

- Use descriptive, component-scoped class names and existing CSS custom
  properties for themeable values.
- Keep selectors specific to the component; avoid new global overrides when a
  component rule is sufficient.
- Preserve reduced-motion and responsive behavior when changing animations or
  layout.

### i18n

- User-facing strings must use matching keys in `src/lang/zh-cn.json` and
  `src/lang/en.json`; use existing dotted key namespaces.
- Use `{paramName}` for interpolation, and run the locale parity tests after
  changing either file.

## Commit Message Guidelines

We follow a simplified Conventional Commits format:

```
<type>(<scope>): <description>

[optional body]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or fixing tests
- `chore`: Build process, dependencies, etc.

Examples:

```
feat(editor): add rainbow bracket support
fix(compile): resolve path with spaces on Windows
docs(readme): add installation instructions
i18n(settings): add missing translations for compiler panel
```

## Testing

- Run focused Node.js test files for the behavior being changed, then run
  `npm test` before submitting.
- Run `npm run format:check` to verify formatting. Use `npm run format` to apply
  the repository formatter instead of hand-formatting large blocks.
- Tests use Node's built-in test runner. Keep tests deterministic and independent
  of Electron UI automation unless the behavior requires an integration test.
- For renderer or Electron changes, also run the application on Windows when
  possible and verify the affected workflow in both supported languages.
- For changes to build scripts or packaging, run the relevant preparation or
  build command and report any environment-specific steps that could not be
  completed.

## Questions?

Feel free to open an issue with the `question` label, or reach out to the maintainers.

---

Thank you for contributing to OICPP IDE! ❤️
