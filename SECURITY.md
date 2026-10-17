# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in OICPP IDE, please report it responsibly.

**Do not open a public issue.** Instead, send an email to:

📧 **mywwzh@163.com**

Please include the following in your report:

- A detailed description of the vulnerability
- Steps to reproduce the issue
- Affected versions
- Any potential impact or exploit scenarios
- Suggested fixes (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity
- **Resolution**: We aim to resolve critical issues within 7 days
- **Disclosure**: We will coordinate public disclosure after a fix is available

## Security Best Practices for Users

- **Keep Updated**: Always use the latest version of OICPP IDE
- **Code Safety**: Be cautious when running untrusted C++ code, as compiled executables can access system resources
- **Network Awareness**: Cloud compilation transmits your code to our servers; do not include sensitive credentials
- **File System**: The IDE has full access to your file system; only open trusted project folders

## Architecture Notes

OICPP IDE is built on Electron and:

- Runs compiled C++ executables as child processes with your user privileges
- Uses node-pty for integrated terminal (spawns shell processes)
- Communicates with a cloud compilation API at `oicpp.mywwzh.top` over HTTPS
- Stores settings locally in `%APPDATA%/oicpp-ide/` and `%USERPROFILE%/.oicpp/`

## Dependencies

We monitor our dependencies for known vulnerabilities. Key dependencies include:

- **Electron** — provides the application framework
- **Monaco Editor** — code editor component
- **node-pty** — pseudo-terminal for integrated shell
- **xterm.js** — terminal emulation in the renderer

Please report any vulnerability you find in our dependency chain as well.
