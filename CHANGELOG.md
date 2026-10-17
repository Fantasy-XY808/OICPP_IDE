# Changelog

All notable changes to OICPP IDE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025

### Added

- Initial community fork release based on [mywwzh/oicpp](https://github.com/mywwzh/oicpp)
- Modern Fluent/WinUI-style interface with rounded panel layout
- Seti color file icons and codicon icon system
- VS Code Monaco Editor integration with rainbow brackets, Inlay Hints, CodeLens
- Built-in MinGW-w64 toolchain (zero-configuration on Windows)
- Integrated terminal with node-pty (PowerShell/Cmd support)
- clangd LSP integration for real-time diagnostics
- Sample tester for OI problem testing
- Code comparer (duipai/对拍) tool
- GDB debugger integration
- Cloud compilation service
- Multi-theme support (Dark, Light, Monokai, Dracula, GitHub, Solarized)
- Glass effect and background image customization
- Code snippets and templates for OI
- Syntax color customization
- Clang-Format integration
- Auto-save and workspace restoration
- i18n support (Chinese Simplified / English)
- 7-Zip based compiler extraction
- Console pauser for non-integrated terminal mode
- PDF viewer for problem statements
- Markdown editor/preview
- Cloud space (file sync)

### Changed

- Major UI modernization from original oicpp project
- Self-contained compiler bundling (no external MinGW required)
- Replaced original editor with Monaco Editor

---

## Upstream History

This project is a community fork of [mywwzh/oicpp](https://github.com/mywwzh/oicpp) (GPL-3.0).
The upstream project provided the foundational C++ IDE concept and initial implementation
for competitive programming. This fork adds significant UI modernization and toolchain
self-containment while preserving the original competition-oriented features.
