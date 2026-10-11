/**
 * Logger (日志模块)
 *
 * File-based logging utility for the main process.
 * Writes timestamped log entries to ~/.oicpp/logs/YYYY-MM-DD-HH-mm-ss.log.
 *
 * Log levels: INFO, WARN, ERROR, DEBUG
 * Timestamps use Beijing time (UTC+8) for consistency.
 *
 * @class Logger
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
    constructor() {
        this.initialized = false;
        this.logDir = path.join(os.homedir(), '.oicpp', 'logs');
        this.logFile = null;
    }

    static timestampFilename(date = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
        const toCN = (d) => {
            const offsetMin = d.getTimezoneOffset();
            const delta = (8 * 60 + offsetMin) * 60000; // 本地时间转为北京时间
            return new Date(d.getTime() + delta);
        };
        const d8 = toCN(date);
        const YYYY = d8.getFullYear();
        const MM = pad(d8.getMonth() + 1);
        const DD = pad(d8.getDate());
        const hh = pad(d8.getHours());
        const mm = pad(d8.getMinutes());
        const ss = pad(d8.getSeconds());
        return `${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}.log`;
    }

    init() {
        if (this.initialized) return this.logFile;
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
            const fileName = Logger.timestampFilename();
            this.logFile = path.join(this.logDir, fileName);
            fs.writeFileSync(this.logFile, '', { flag: 'a' });

            this.rotate(5);

            this.initialized = true;
            return this.logFile;
        } catch (e) {
            return null;
        }
    }

    rotate(keepCount = 5) {
        try {
            if (!fs.existsSync(this.logDir)) return;
            const files = fs
                .readdirSync(this.logDir)
                .filter((f) => f.endsWith('.log'))
                .map((f) => ({
                    name: f,
                    full: path.join(this.logDir, f),
                    mtime: fs.statSync(path.join(this.logDir, f)).mtimeMs,
                }))
                .sort((a, b) => b.mtime - a.mtime);

            const toDelete = files.slice(keepCount);
            for (const f of toDelete) {
                try { fs.unlinkSync(f.full); } catch (_) { }
            }
        } catch (e) {
        }
    }

    static stringifyArgs(args, { level = 'info', maxLen = 2000 } = {}) {
        // Credential shapes that must never reach ~/.oicpp/logs/. Keys are
        // compared after stripping separators, so loginToken, login_token and
        // LOGIN-TOKEN all match.
        const SENSITIVE_KEYS = new Set([
            'password', 'passwd', 'pwd', 'secret', 'token', 'accesstoken', 'refreshtoken',
            'logintoken', 'encodedtoken', 'cookie', 'cookies', 'setcookie', 'authorization',
            'auth', 'credential', 'credentials', 'apikey', 'privatekey', 'sessionid',
            'sessionkey', 'csrf', 'csrftoken'
        ]);
        const REDACTED = '[redacted]';
        const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[\s_-]/g, '');
        const isSensitiveKey = (key) => SENSITIVE_KEYS.has(normalizeKey(key));

        // Used to be an identity function, which is why nothing was ever
        // redacted despite the name.
        const redactingReplacer = (key, value) => (isSensitiveKey(key) ? REDACTED : value);

        // Used to be called further down but was never defined anywhere in the
        // repo, so that error branch threw a ReferenceError and the outer catch
        // swallowed it.
        const redactString = (text) => {
            if (typeof text !== 'string') return text;
            return text.replace(
                /(\b[A-Za-z0-9_.-]*(?:token|cookie|password|passwd|secret|authorization|sessionid|csrf)[A-Za-z0-9_.-]*\s*[=:]\s*)([^\s;,&]+)/gi,
                (match, prefix) => prefix + REDACTED
            );
        };
        const serializeError = (err) => {
            try {
                const base = {
                    name: err?.name || 'Error',
                    message: err?.message || String(err),
                    stack: err?.stack || undefined,
                };
                ['code', 'errno', 'syscall', 'path', 'address', 'port'].forEach((k) => {
                    if (err && err[k] !== undefined) base[k] = err[k];
                });
                if (err && err.cause) {
                    base.cause = typeof err.cause === 'object' ? serializeError(err.cause) : String(err.cause);
                }
                if (err && err.data) base.data = err.data;
                return base;
            } catch (_) {
                return { message: String(err) };
            }
        };
        const INFO_PER_ARG_LIMIT = 1200; // info 级别单参数最大字符串长度（超过则采样或截断）
        const clamp = (s, lim = INFO_PER_ARG_LIMIT) => {
            if (typeof s !== 'string') return s;
            if (s.length <= lim) return s;
            return `${s.slice(0, lim)} ... [truncated ${s.length - lim} chars]`;
        };
        const infoStringify = (v) => {
            if (v === null || v === undefined) return String(v);
            if (v instanceof Error) return JSON.stringify(serializeError(v), null, 2);
            if (typeof v === 'string') return clamp(redactString(v), INFO_PER_ARG_LIMIT);
            try {
                const full = JSON.stringify(v, redactingReplacer, 2);
                if (full && full.length <= INFO_PER_ARG_LIMIT) return full;

                if (Array.isArray(v)) {
                    const sample = v.slice(0, 10);
                    const sampleStr = JSON.stringify(sample, redactingReplacer, 2);
                    const suffix = v.length > 10 ? ` ... [+${v.length - 10} more]` : '';
                    return `[Array(${v.length}) sample]: ${clamp(sampleStr, INFO_PER_ARG_LIMIT)}${suffix}`;
                }

                if (typeof v === 'object') {
                    const keys = Object.keys(v);
                    const pick = keys.slice(0, 12);
                    const sampleObj = {};
                    for (const k of pick) sampleObj[k] = v[k];
                    const sampleStr = JSON.stringify(sampleObj, redactingReplacer, 2);
                    const more = keys.length > pick.length ? `, ... ${keys.length - pick.length} more keys` : '';
                    return `{Object with ${keys.length} keys, sample}: ${clamp(sampleStr, INFO_PER_ARG_LIMIT)}${more}`;
                }

                return clamp(String(v), INFO_PER_ARG_LIMIT);
            } catch (_) {
                try { return JSON.stringify(v, redactingReplacer); } catch (e2) { return String(v); }
            }
        };
        const verbose = (v) => {
            if (v === null || v === undefined) return String(v);
            if (v instanceof Error) return JSON.stringify(serializeError(v), null, 2);
            if (typeof v === 'string') return redactString(v);
            if (typeof v === 'object' && v && v.error instanceof Error && Object.keys(v).length === 1) {
                return redactString(JSON.stringify({ error: serializeError(v.error) }, null, 2));
            }
            try { return JSON.stringify(v, redactingReplacer, 2); } catch (_) { return String(v); }
        };
        try {
            const joined = args.map(level === 'info' ? infoStringify : verbose).join(' ');
            if (level === 'info' && typeof joined === 'string' && joined.length > maxLen) {
                return `${joined.slice(0, maxLen)} ... [truncated ${joined.length - maxLen} chars]`;
            }
            return joined;
        } catch (_) {
            return String(args);
        }
    }

    write(level, ...args) {
        const pad = (n, w = 2) => String(n).padStart(w, '0');
        const now = new Date();
        const offsetMin = now.getTimezoneOffset();
        const delta = (8 * 60 + offsetMin) * 60000;
        const d8 = new Date(now.getTime() + delta);
        const ts = `${d8.getFullYear()}-${pad(d8.getMonth() + 1)}-${pad(d8.getDate())} ${pad(d8.getHours())}:${pad(d8.getMinutes())}:${pad(d8.getSeconds())}.${pad(d8.getMilliseconds(), 3)}+08:00`;
        const line = `[${ts}] [${level.toUpperCase()}] ${Logger.stringifyArgs(args, { level })}\n`;

        try {
            if (!this.initialized) this.init();
            if (this.logFile) fs.appendFileSync(this.logFile, line, 'utf8');
        } catch (e) {
        }

        // 同时输出到终端控制台
        const trimmed = line.trim();
        if (level === 'error' || level === 'warn') {
            console.error(trimmed);
        } else {
            console.log(trimmed);
        }
    }

    logInfo(...args) { this.write('info', ...args); }
    logwarn(...args) { this.write('warn', ...args); }
    logerror(...args) { this.write('error', ...args); }
    logWarn(...args) { this.write('warn', ...args); }
    logError(...args) { this.write('error', ...args); }

    getLogFile() { if (!this.initialized) this.init(); return this.logFile; }
}

module.exports = new Logger();