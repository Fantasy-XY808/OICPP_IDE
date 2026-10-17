// =============================================================
// in-app-bridge.js — 应用内窗口子页面桥接
// 当设置页被 iframe 承载（应用内窗口模式）时：
//   1. 从父窗口取得 electronAPI（contextBridge 对象，同进程可直接引用）
//   2. 拦截 window.close()，改为关闭承载它的应用内窗口
// 以独立 BrowserWindow 打开时本脚本不做任何事，行为保持原样。
// =============================================================
(function () {
    'use strict';

    try {
        if (!window.frameElement || !window.parent) return;

        // 标记 iframe 模式：modern.css 据此将设置页背景透明化，透出玻璃浮窗
        document.documentElement.classList.add('oicpp-in-app');

        if (!window.electronAPI && window.parent.electronAPI) {
            window.electronAPI = window.parent.electronAPI;
        }
        // contextBridge 只注入主 frame：补齐 electron-helper 依赖的模块桥
        if (!window.getElectronModule && window.parent.getElectronModule) {
            window.getElectronModule = window.parent.getElectronModule;
            window.__electronRequireAvailable = true;
        }
        if (!window.logInfo && window.parent.logInfo) {
            window.logInfo = window.parent.logInfo;
        }

        // 与主窗口主题保持一致
        document.addEventListener('DOMContentLoaded', () => {
            try {
                const parentBody = window.parent.document.body;
                ['data-theme', 'data-editor-theme'].forEach((attr) => {
                    const val = parentBody.getAttribute(attr);
                    if (val) document.body.setAttribute(attr, val);
                });
                ['theme-light', 'theme-dark', 'light-theme', 'dark-theme'].forEach((cls) => {
                    if (parentBody.classList.contains(cls)) document.body.classList.add(cls);
                });
            } catch (err) {
                /* ignore */
            }
        });

        window.close = function () {
            try {
                window.parent.dispatchEvent(
                    new CustomEvent('oicpp:appwindow-close', {
                        detail: { frame: window.frameElement },
                    })
                );
            } catch (e) {
                /* ignore */
            }
        };
    } catch (e) {
        /* 独立窗口或跨域时静默跳过 */
    }
})();
