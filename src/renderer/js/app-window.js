// =============================================================
// app-window.js — 应用内子窗口系统
// 将原先的独立 BrowserWindow（设置页等）改为应用内模态窗口：
//   亚克力模糊遮罩 + 玻璃拟态浮窗 + 可拖拽标题栏 + iframe 内容。
// 子页面通过 in-app-bridge.js 获得 electronAPI 桥接与 close 拦截。
// =============================================================
(function () {
    'use strict';

    const WINDOWS = {}; // id -> { root, win, options }

    function log() {
        try {
            console.log('[app-window]', ...arguments);
        } catch (e) {
            /* ignore */
        }
    }

    function createDom(options) {
        const overlay = document.createElement('div');
        overlay.className = 'app-window-overlay';
        overlay.dataset.winId = options.id;

        const win = document.createElement('div');
        win.className = 'app-window';
        win.style.width = (options.width || 800) + 'px';
        win.style.height = (options.height || 600) + 'px';

        const titlebar = document.createElement('div');
        titlebar.className = 'app-window-titlebar';
        titlebar.innerHTML =
            '<span class="app-window-title"></span>' +
            '<button class="app-window-close" tabindex="-1" aria-label="关闭">' +
            '<i class="codicon codicon-close"></i></button>';
        titlebar.querySelector('.app-window-title').textContent = options.title || '窗口';

        const frame = document.createElement('iframe');
        frame.className = 'app-window-frame';
        frame.dataset.winId = options.id;
        frame.setAttribute('frameborder', '0');

        win.appendChild(titlebar);
        win.appendChild(frame);
        overlay.appendChild(win);
        document.body.appendChild(overlay);

        return { overlay, win, titlebar, frame };
    }

    function centerWithin(win) {
        // 以声明尺寸实时计算（打开瞬间 overlay 仍是 display:none，无布局尺寸）
        const w = parseInt(win.style.width, 10) || 800;
        const h = parseInt(win.style.height, 10) || 600;
        const x = Math.max(16, (window.innerWidth - w) / 2);
        const y = Math.max(16, (window.innerHeight - h) / 2.4);
        win.style.left = x + 'px';
        win.style.top = y + 'px';
    }

    // 将浮窗钳制回视口内（用户拖动过或窗口缩放后调用）
    function clampIntoViewport(win) {
        const w = win.offsetWidth || parseInt(win.style.width, 10) || 800;
        const h = win.offsetHeight || parseInt(win.style.height, 10) || 600;
        const minX = -(w - 120);
        const minY = -8;
        const maxX = Math.max(minX, window.innerWidth - 120);
        const maxY = Math.max(minY, window.innerHeight - 48);
        const x = Math.min(Math.max(parseFloat(win.style.left) || 0, minX), maxX);
        const y = Math.min(Math.max(parseFloat(win.style.top) || 0, minY), maxY);
        win.style.left = x + 'px';
        win.style.top = y + 'px';
    }

    function applyPlacement(win) {
        if (win.dataset.dragged === '1') {
            clampIntoViewport(win);
        } else {
            centerWithin(win);
        }
    }

    // 主窗口缩放时实时跟随：未拖动过的浮窗重新居中，拖动过的钳制回视口
    window.addEventListener('resize', () => {
        for (const id of Object.keys(WINDOWS)) {
            const entry = WINDOWS[id];
            if (!entry.overlay.classList.contains('open')) continue;
            applyPlacement(entry.win);
        }
    });

    function enableDrag(win, handle) {
        let startX = 0,
            startY = 0,
            baseX = 0,
            baseY = 0,
            dragging = false;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.app-window-close')) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            baseX = parseFloat(win.style.left) || 0;
            baseY = parseFloat(win.style.top) || 0;
            win.classList.add('dragging');
            handle.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            win.style.left = baseX + e.clientX - startX + 'px';
            win.style.top = baseY + e.clientY - startY + 'px';
            clampIntoViewport(win);
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            win.classList.remove('dragging');
            handle.style.cursor = '';
            win.dataset.dragged = '1';
            clampIntoViewport(win);
        });
    }

    function bridgeFrame(frame, api) {
        frame.addEventListener('load', () => {
            try {
                const w = frame.contentWindow;
                // electronAPI 由 contextBridge 暴露，同进程内可跨 frame 引用
                if (w && !w.electronAPI && window.electronAPI) {
                    w.electronAPI = window.electronAPI;
                }
                log('子页面桥接完成:', frame.dataset.winId);
            } catch (err) {
                log('子页面桥接失败（跨域限制）:', err && err.message);
            }
        });
    }

    const api = {
        open(options) {
            const id = options.id || 'win-' + Date.now();
            if (WINDOWS[id]) {
                WINDOWS[id].overlay.classList.add('open');
                return WINDOWS[id].api;
            }
            const opts = Object.assign({ width: 800, height: 600, title: '' }, options);
            opts.id = id;

            const dom = createDom(opts);
            enableDrag(dom.win, dom.titlebar);
            bridgeFrame(dom.frame, api);

            const winApi = {
                close() {
                    dom.overlay.classList.remove('open');
                    // 延迟移除，保留过渡动画
                    setTimeout(() => {
                        if (WINDOWS[id] && !WINDOWS[id].overlay.classList.contains('open')) {
                            dom.overlay.remove();
                            delete WINDOWS[id];
                        }
                    }, 220);
                },
                focus() {
                    dom.overlay.classList.add('open');
                },
            };

            WINDOWS[id] = { overlay: dom.overlay, win: dom.win, api: winApi, options: opts };

            dom.overlay.classList.add('open');
            // 显示后下一帧再实时计算居中位置（此时布局尺寸才有效）
            requestAnimationFrame(() => applyPlacement(dom.win));
            dom.titlebar.querySelector('.app-window-close').addEventListener('click', () => winApi.close());
            dom.overlay.addEventListener('mousedown', (e) => {
                if (e.target === dom.overlay) winApi.close();
            });
            window.addEventListener('oicpp:appwindow-close', (event) => {
                const frameEl = event?.detail?.frame;
                if (frameEl && frameEl.dataset.winId === id) winApi.close();
            });

            dom.frame.src = opts.src;
            log('打开应用内窗口:', id, opts.src);
            return winApi;
        },

        close(id) {
            if (id && WINDOWS[id]) WINDOWS[id].api.close();
        },

        isOpen(id) {
            return !!(WINDOWS[id] && WINDOWS[id].overlay.classList.contains('open'));
        },
    };

    window.oicppAppWindow = api;
})();
