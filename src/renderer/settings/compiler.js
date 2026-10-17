class CompilerSettings {
    constructor() {
        this.settings = {
            compilerPath: '',
            pythonInterpreterPath: '',
            compilerArgs: '-std=c++14 -O2 -static',
            runMode: 'integrated-terminal',
        };
        this.isMacPlatform = false;
        this.isIntegratedOnlyPlatform = false;

        this.init();
    }

    setupSidebarNavigation() {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        const sections = document.querySelectorAll('.settings-section');

        sidebarItems.forEach((item) => {
            item.addEventListener('click', () => {
                sidebarItems.forEach((i) => i.classList.remove('active'));
                item.classList.add('active');

                sections.forEach((section) => section.classList.remove('active'));

                const targetId = item.getAttribute('data-target');
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const themeFromUrl = urlParams.get('theme');
        if (themeFromUrl) {
            this.applyTheme(themeFromUrl);
        }
        await this.loadSettings();
        this.isMacPlatform = await this.detectMacPlatform();
        this.isIntegratedOnlyPlatform = await this.detectIntegratedOnlyPlatform();
        if (this.isIntegratedOnlyPlatform) {
            this.settings.runMode = 'integrated-terminal';
        }
        this.setupEventListeners();
        this.setupThemeListener();
        await this.applyCurrentTheme();
        this.updateUI();
        this.detectExistingCompiler();
    }

    setupThemeListener() {
        if (window.electronIPC && window.electronIPC.on) {
            window.electronIPC.on('theme-changed', (event, theme) => {
                logInfo('编译器设置页面收到主题变更:', theme);
                this.applyTheme(theme);
            });
        }
    }

    async applyCurrentTheme() {
        try {
            if (window.electronAPI && window.electronAPI.getAllSettings) {
                const settings = await window.electronAPI.getAllSettings();
                if (settings && settings.theme) {
                    this.applyTheme(settings.theme);
                }
            }
        } catch (error) {
            logError('获取主题设置失败:', error);
        }
    }

    applyTheme(theme) {
        logInfo('应用主题到编译器设置页面:', theme);
        document.body.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    setupEventListeners() {
        logInfo('[编译器设置] 开始设置事件监听器');

        this.setupSidebarNavigation();

        const browsePythonBtn = document.getElementById('browse-python-interpreter');
        if (browsePythonBtn) {
            browsePythonBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.browsePythonInterpreter();
            });
        }

        const browseTestlibBtn = document.getElementById('browse-testlib');
        if (browseTestlibBtn) {
            browseTestlibBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.browseTestlib();
            });
        }

        const installTestlibBtn = document.getElementById('install-testlib');
        if (installTestlibBtn) {
            installTestlibBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTestlibInstallDialog();
            });
        }

        const closeTestlibBtn = document.getElementById('close-testlib-install-dialog');
        if (closeTestlibBtn) {
            closeTestlibBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeTestlibInstallDialog();
            });
        }

        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            logInfo('[编译器设置] 保存设置按钮事件已绑定');
            saveBtn.addEventListener('click', (e) => {
                logInfo('[编译器设置] 保存设置按钮被点击');
                e.preventDefault();
                this.saveSettings();
            });
        } else {
            logError('[编译器设置] 未找到保存设置按钮');
        }

        const cancelBtn = document.getElementById('cancel-settings');
        if (cancelBtn) {
            logInfo('[编译器设置] 取消按钮事件已绑定');
            cancelBtn.addEventListener('click', (e) => {
                logInfo('[编译器设置] 取消按钮被点击');
                e.preventDefault();
                this.closeWindow();
            });
        } else {
            logError('[编译器设置] 未找到取消按钮');
        }

        const resetBtn = document.getElementById('reset-settings');
        if (resetBtn) {
            logInfo('[编译器设置] 重置按钮事件已绑定');
            resetBtn.addEventListener('click', (e) => {
                logInfo('[编译器设置] 重置按钮被点击');
                e.preventDefault();
                this.resetSettings();
            });
        }

        const compilerOptions = document.getElementById('compiler-options');
        if (compilerOptions) {
            compilerOptions.addEventListener('input', (e) => {
                logInfo('[编译器设置] 编译器选项发生变化:', e.target.value);
                this.settings.compilerArgs = e.target.value;
            });
            logInfo('[编译器设置] 编译器选项变化监听已绑定');
        } else {
            logError('[编译器设置] 未找到编译器选项元素');
        }

        const pythonInterpreterPath = document.getElementById('python-interpreter-path');
        if (pythonInterpreterPath) {
            pythonInterpreterPath.addEventListener('input', (e) => {
                this.settings.pythonInterpreterPath = e.target.value;
            });
        }

        const testTestlibBtn = document.getElementById('test-testlib');
        if (testTestlibBtn) {
            testTestlibBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.testTestlib();
            });
        }

        const runModeSelect = document.getElementById('run-mode');
        if (runModeSelect) {
            runModeSelect.addEventListener('change', (e) => {
                if (this.isIntegratedOnlyPlatform) {
                    e.target.value = 'integrated-terminal';
                    this.settings.runMode = 'integrated-terminal';
                    return;
                }
                this.settings.runMode = e.target.value === 'integrated-terminal' ? 'integrated-terminal' : 'popup';
            });
        }
    }

    async loadSettings() {
        try {
            const platform = await this.getCurrentPlatform();
            const isMacPlatform = platform === 'macos' || platform === 'darwin' || platform === 'mac';
            const isIntegratedOnlyPlatform = isMacPlatform || platform === 'linux';
            this.isMacPlatform = isMacPlatform;
            this.isIntegratedOnlyPlatform = isIntegratedOnlyPlatform;
            const allSettings = await window.electronAPI.getAllSettings();
            if (allSettings) {
                const loadedCompilerArgs =
                    allSettings.compilerArgs || (isMacPlatform ? '-std=c++14 -O2' : '-std=c++14 -O2 -static');
                this.settings = {
                    compilerPath: allSettings.compilerPath || '',
                    pythonInterpreterPath: allSettings.pythonInterpreterPath || '',
                    compilerArgs: isMacPlatform
                        ? loadedCompilerArgs
                              .replace(/\s-static\b/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim()
                        : loadedCompilerArgs,
                    runMode: isIntegratedOnlyPlatform ? 'integrated-terminal' : allSettings.runMode || 'popup',
                    testlibPath: allSettings.testlibPath || '',
                };
            }
            logInfo('编译器设置加载完成:', this.settings);
        } catch (error) {
            logError('加载编译器设置失败:', error);
        }
    }

    updateUI() {
        const pythonInterpreterPathInput = document.getElementById('python-interpreter-path');
        const compilerOptionsInput = document.getElementById('compiler-options');
        const runModeSelect = document.getElementById('run-mode');
        const testlibPathInput = document.getElementById('testlib-path');

        if (pythonInterpreterPathInput) pythonInterpreterPathInput.value = this.settings.pythonInterpreterPath || '';
        if (compilerOptionsInput) compilerOptionsInput.value = this.settings.compilerArgs || '-std=c++14 -O2 -static';
        if (runModeSelect) {
            const popupOption = runModeSelect.querySelector('option[value="popup"]');
            const runModeHint = runModeSelect.parentElement ? runModeSelect.parentElement.querySelector('.hint') : null;
            if (this.isIntegratedOnlyPlatform) {
                if (popupOption) popupOption.disabled = true;
                runModeSelect.value = 'integrated-terminal';
                if (runModeHint) {
                    runModeHint.textContent = window.i18n
                        ? window.i18n.t('compiler.integratedOnlyHint')
                        : 'macOS/Linux only supports integrated terminal mode';
                }
            } else {
                if (popupOption) popupOption.disabled = false;
                runModeSelect.value = this.settings.runMode || 'popup';
                if (runModeHint) {
                    runModeHint.textContent = window.i18n
                        ? window.i18n.t('compiler.runModeDesc')
                        : 'Integrated terminal mode creates a new terminal and runs the program automatically';
                }
            }
        }
        if (testlibPathInput) testlibPathInput.value = this.settings.testlibPath || '';
    }

    async browsePythonInterpreter() {
        try {
            const platform = await this.getCurrentPlatform();
            let title = '选择 Python 解释器';
            let filters = [{ name: '所有文件', extensions: ['*'] }];

            if (platform === 'windows') {
                title = '选择 Python 解释器 (python.exe)';
                filters = [
                    { name: '可执行文件 (*.exe)', extensions: ['exe'] },
                    { name: '所有文件', extensions: ['*'] },
                ];
            }

            const result = await window.electronAPI.showOpenDialog({
                title,
                filters,
                properties: ['openFile'],
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const selectedPath = result.filePaths[0];
                this.settings.pythonInterpreterPath = selectedPath;
                const input = document.getElementById('python-interpreter-path');
                if (input) {
                    input.value = selectedPath;
                }
                this.showMessage(
                    window.i18n ? window.i18n.t('compiler.testlibPathSaved') : '已选择 Python 解释器',
                    'success'
                );
            }
        } catch (error) {
            logError('浏览 Python 解释器失败:', error);
            this.showMessage(
                window.i18n
                    ? window.i18n.t('compiler.browseFailed', { error: error.message })
                    : '浏览 Python 解释器失败：' + error.message,
                'error'
            );
        }
    }

    async saveSettings() {
        try {
            const pythonInterpreterPath = document.getElementById('python-interpreter-path').value;
            let compilerArgs = document.getElementById('compiler-options').value;
            const runModeSelect = document.getElementById('run-mode');
            const runMode = this.isIntegratedOnlyPlatform
                ? 'integrated-terminal'
                : runModeSelect && runModeSelect.value === 'integrated-terminal'
                  ? 'integrated-terminal'
                  : 'popup';

            if (this.isMacPlatform && typeof compilerArgs === 'string') {
                compilerArgs = compilerArgs
                    .replace(/\s-static\b/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            const newSettings = {
                pythonInterpreterPath: pythonInterpreterPath,
                compilerArgs: compilerArgs,
                runMode: runMode,
            };

            logInfo('准备保存编译器设置:', newSettings);

            if (window.electronAPI && window.electronAPI.updateSettings) {
                const result = await window.electronAPI.updateSettings(newSettings);
                logInfo('保存设置结果:', result);
                if (result.success) {
                    this.showMessage(
                        window.i18n ? window.i18n.t('compiler.saveSuccess') : '编译器设置保存成功！',
                        'success'
                    );
                } else {
                    this.showMessage(
                        window.i18n
                            ? window.i18n.t('compiler.saveFail', { error: result.error || '未知错误' })
                            : '保存设置失败：' + (result.error || '未知错误'),
                        'error'
                    );
                }
            } else {
                this.showMessage(window.i18n ? window.i18n.t('compiler.apiUnavailable') : '设置 API 不可用', 'error');
            }
        } catch (error) {
            logError('保存编译器设置失败:', error);
            this.showMessage('保存设置失败：' + error.message, 'error');
        }
    }

    async resetSettings() {
        try {
            if (window.electronAPI && window.electronAPI.resetSettings) {
                const result = await window.electronAPI.resetSettings();
                if (result.success) {
                    await this.loadSettings();
                    this.updateUI();
                    this.showMessage(
                        window.i18n ? window.i18n.t('compiler.resetSuccess') : '编译器设置已重置为默认值',
                        'success'
                    );
                } else {
                    this.showMessage('重置设置失败：' + (result.error || '未知错误'), 'error');
                }
            } else {
                this.showMessage('设置 API 不可用', 'error');
            }
        } catch (error) {
            logError('重置设置失败:', error);
            this.showMessage('重置设置失败：' + error.message, 'error');
        }
    }

    async detectExistingCompiler() {
        const status = document.getElementById('compiler-runtime-status');
        if (!status) {
            logWarn('编译环境状态元素不存在');
            return;
        }
        try {
            if (!window.electronAPI || !window.electronAPI.detectCompilers) {
                throw new Error('编译环境检测服务不可用');
            }
            const found = await window.electronAPI.detectCompilers();
            if (!Array.isArray(found) || found.length === 0) {
                status.textContent = window.i18n
                    ? window.i18n.t('compiler.runtimeMissing')
                    : '未检测到可用编译环境。请重新安装应用或检查系统环境。';
                return;
            }

            const compiler = found.find((item) => item.path === this.settings.compilerPath) || found[0];
            status.textContent = window.i18n
                ? window.i18n.t('compiler.runtimeReady', { name: compiler.name })
                : `编译环境已就绪：${compiler.name}`;
        } catch (e) {
            logWarn('编译环境检测失败:', e?.message || e);
            if (status) {
                status.textContent = window.i18n
                    ? window.i18n.t('compiler.runtimeDetectionFailed')
                    : '编译环境检测失败，请重启应用后重试。';
            }
        }
    }

    async getCurrentPlatform() {
        if (window.electronAPI && window.electronAPI.getPlatform) {
            return await window.electronAPI.getPlatform();
        }

        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('win')) return 'windows';
        if (userAgent.includes('mac')) return 'macos';
        if (userAgent.includes('linux')) return 'linux';
        return 'windows'; // 默认
    }

    async detectMacPlatform() {
        const platform = await this.getCurrentPlatform();
        return platform === 'macos' || platform === 'darwin' || platform === 'mac';
    }

    async detectIntegratedOnlyPlatform() {
        const platform = await this.getCurrentPlatform();
        return platform === 'linux' || platform === 'macos' || platform === 'darwin' || platform === 'mac';
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-toast ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#f44336';
                break;
            default:
                messageDiv.style.backgroundColor = '#2196F3';
        }

        try {
            if (type === 'error') {
                const errObj = message instanceof Error ? message : new Error(String(message));
                logError('[CompilerSettingsToastError]', { message: String(message), stack: errObj.stack });
            }
        } catch (_) {}
        document.body.appendChild(messageDiv);

        requestAnimationFrame(() => {
            messageDiv.style.opacity = '1';
        });

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    showConfirmDialog(title, message, confirmText = '确定', cancelText = '取消') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            dialog.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                min-width: 300px;
                max-width: 500px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            `;

            dialog.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #333; font-size: 16px;">${title}</h3>
                </div>
                <div style="margin-bottom: 20px; line-height: 1.5; white-space: pre-line;">
                    ${message}
                </div>
                <div style="text-align: right;">
                    <button class="cancel-btn" style="
                        margin-right: 10px;
                        padding: 8px 16px;
                        border: 1px solid #ddd;
                        background: #f5f5f5;
                        border-radius: 4px;
                        cursor: pointer;
                    ">${cancelText}</button>
                    <button class="confirm-btn" style="
                        padding: 8px 16px;
                        border: none;
                        background: #007acc;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">${confirmText}</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const confirmBtn = dialog.querySelector('.confirm-btn');
            const cancelBtn = dialog.querySelector('.cancel-btn');

            const cleanup = () => {
                document.body.removeChild(overlay);
            };

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }

    async browseTestlib() {
        try {
            if (window.electronAPI && window.electronAPI.showOpenDialog) {
                const result = await window.electronAPI.showOpenDialog({
                    title: '选择testlib.h文件',
                    properties: ['openFile'],
                    filters: [
                        { name: 'Testlib头文件', extensions: ['h'] },
                        { name: '所有文件', extensions: ['*'] },
                    ],
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const testlibPath = result.filePaths[0];

                    const fileName = testlibPath
                        .split(/[\\\/]/)
                        .pop()
                        .toLowerCase();
                    if (fileName !== 'testlib.h') {
                        this.showMessage(
                            window.i18n ? window.i18n.t('compiler.selectTestlibFile') : '请选择testlib.h文件',
                            'error'
                        );
                        return;
                    }

                    document.getElementById('testlib-path').value = testlibPath;

                    if (window.electronAPI && window.electronAPI.saveSetting) {
                        await window.electronAPI.saveSetting('testlibPath', testlibPath);
                        this.showMessage(
                            window.i18n ? window.i18n.t('compiler.testlibPathSaved') : 'Testlib路径已保存',
                            'success'
                        );
                    }
                }
            }
        } catch (error) {
            logError('选择testlib.h文件失败:', error);
            this.showMessage(
                window.i18n
                    ? window.i18n.t('compiler.selectTestlibFail', { error: error.message })
                    : '选择testlib.h文件失败: ' + error.message,
                'error'
            );
        }
    }

    async testTestlib() {
        const testlibPath = document.getElementById('testlib-path').value;
        const resultDiv = document.getElementById('testlib-test-result');

        const renderTestResult = (type, message) => {
            if (!resultDiv) return;
            resultDiv.classList.remove('is-success', 'is-error', 'is-testing');
            if (type === 'success') {
                resultDiv.classList.add('is-success');
            } else if (type === 'error') {
                resultDiv.classList.add('is-error');
            } else {
                resultDiv.classList.add('is-testing');
            }
            resultDiv.textContent = message;
        };

        if (!testlibPath) {
            renderTestResult('error', '请先设置 Testlib 路径');
            return;
        }

        renderTestResult('testing', '正在测试 Testlib 环境...');

        try {
            if (window.electronAPI && window.electronAPI.testTestlib) {
                const result = await window.electronAPI.testTestlib(testlibPath);

                if (result.success) {
                    renderTestResult('success', 'Testlib 测试成功！');
                } else {
                    renderTestResult('error', `Testlib 测试失败：${result.error || '未知错误'}`);
                }
            } else {
                renderTestResult('error', '测试 API 不可用');
            }
        } catch (error) {
            logError('测试Testlib失败:', error);
            renderTestResult('error', `测试失败：${error.message}`);
        }
    }

    showTestlibInstallDialog() {
        const dialog = document.getElementById('testlib-install-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
            this.loadAvailableTestlibs();
        }
    }

    closeTestlibInstallDialog() {
        const dialog = document.getElementById('testlib-install-dialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    async loadAvailableTestlibs() {
        const testlibList = document.getElementById('testlib-list');
        if (!testlibList) return;

        testlibList.innerHTML = '<div class="loading">正在获取Testlib列表...</div>';

        try {
            const response = await fetch('https://oicpp.mywwzh.top/api/getAvailableTestlibList');

            if (!response.ok) {
                throw new Error(`Network error: ${response.status} ${response.statusText}`);
            }

            const testlibs = await response.json();

            testlibList.innerHTML = '';

            if (!testlibs || testlibs.length === 0) {
                testlibList.innerHTML = '<div class="no-compilers">暂无可用Testlib版本</div>';
                return;
            }

            const downloadedVersions = await this.getDownloadedTestlibVersions();

            for (const testlib of testlibs) {
                const isDownloaded = downloadedVersions.includes(testlib.version);
                const isSelected = await this.isTestlibSelected(testlib.version);

                const testlibDiv = document.createElement('div');
                testlibDiv.className = `compiler-item ${isDownloaded ? 'downloaded' : ''} ${isSelected ? 'selected' : ''}`;

                const downloadUrl = testlib.downloadUrl.startsWith('http')
                    ? testlib.downloadUrl
                    : `https://oicpp.mywwzh.top${testlib.downloadUrl}`;

                const versionLabel = window.i18n ? window.i18n.t('compiler.versionSelected').split(' ')[0] : 'Version:';
                const sizeLabel = window.i18n
                    ? window.i18n.t('compiler.testlibSize', { size: testlib.file_size_mb })
                    : 'Size: ' + testlib.file_size_mb + 'MB';
                testlibDiv.innerHTML = `
                    <div class="compiler-info">
                        <h4>${testlib.name}</h4>
                        <p>${versionLabel} ${testlib.version}</p>
                        <p>${testlib.description}</p>
                        <span class="platform">${sizeLabel}</span>
                    </div>
                    <div class="compiler-actions">
                        ${
                            isSelected
                                ? '<span class="status selected-status">' +
                                  (window.i18n ? window.i18n.t('compiler.selected') : 'Selected') +
                                  '</span>'
                                : isDownloaded
                                  ? '<button class="select-btn" data-version="' +
                                    testlib.version +
                                    '">' +
                                    (window.i18n ? window.i18n.t('compiler.select') : 'Select') +
                                    '</button>'
                                  : '<button class="download-btn" data-url="' +
                                    downloadUrl +
                                    '" data-version="' +
                                    testlib.version +
                                    '" data-name="' +
                                    testlib.name +
                                    '">' +
                                    (window.i18n ? window.i18n.t('compiler.download') : 'Download') +
                                    '</button>'
                        }
                        ${isDownloaded ? '<span class="status downloaded-status">' + (window.i18n ? window.i18n.t('compiler.downloaded') : 'Downloaded') + '</span>' : ''}
                    </div>
                `;

                this.addTestlibItemListeners(testlibDiv, testlib);
                testlibList.appendChild(testlibDiv);
            }
        } catch (error) {
            logError('获取Testlib列表失败:', error);
            testlibList.innerHTML = `
                <div class="error-message">
                    <p>${window.i18n ? window.i18n.t('compiler.networkError') : 'Network error: could not fetch list'}</p>
                    <p class="error-detail">${error.message}</p>
                    <button class="retry-btn" data-i18n="compiler.retry">Retry</button>
                </div>
            `;
            const retryBtn = testlibList.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.loadAvailableTestlibs();
                });
            }
        }
    }

    addTestlibItemListeners(testlibDiv, testlib) {
        const downloadBtn = testlibDiv.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadTestlib(testlib);
            });
        }

        const selectBtn = testlibDiv.querySelector('.select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTestlib(testlib.version);
            });
        }
    }

    async downloadTestlib(testlib) {
        const downloadBtn = document.querySelector(`button.download-btn[data-version="${testlib.version}"]`);
        if (!downloadBtn) return;

        try {
            downloadBtn.disabled = true;
            downloadBtn.textContent = '下载中...';

            this.showMessage(`开始下载 ${testlib.name} ${testlib.version}...`, 'info');

            if (window.electronAPI && window.electronAPI.downloadTestlib) {
                const fullUrl = testlib.downloadUrl.startsWith('http')
                    ? testlib.downloadUrl
                    : `https://oicpp.mywwzh.top${testlib.downloadUrl}`;

                const result = await window.electronAPI.downloadTestlib({
                    url: fullUrl,
                    version: testlib.version,
                    name: testlib.name,
                });

                if (result.success) {
                    this.showMessage(`${testlib.name} ${testlib.version} 下载并安装成功！`, 'success');

                    downloadBtn.textContent = '已下载';
                    downloadBtn.disabled = false;
                    downloadBtn.classList.remove('download-btn');
                    downloadBtn.classList.add('downloaded-btn');

                    if (result.testlibPath) {
                        await this.setTestlibPath(result.testlibPath);
                        await this.selectTestlib(testlib.version);
                    }
                } else {
                    throw new Error(result.error || '下载失败');
                }
            } else {
                throw new Error('下载 API 不可用');
            }
        } catch (error) {
            logError('下载Testlib失败:', error);
            this.showMessage(`下载失败: ${error.message}`, 'error');

            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.textContent = '下载';
            }
        }
    }

    async selectTestlib(version) {
        try {
            if (window.electronAPI && window.electronAPI.selectTestlib) {
                const result = await window.electronAPI.selectTestlib(version);

                if (result.success) {
                    this.showMessage(`已选择Testlib ${version}`, 'success');

                    if (result.testlibPath) {
                        await this.setTestlibPath(result.testlibPath);
                    }

                    const testlibItems = document.querySelectorAll('.compiler-item');
                    testlibItems.forEach((item) => {
                        const selectBtn = item.querySelector('.select-btn');
                        if (selectBtn) {
                            const itemVersion = selectBtn.getAttribute('data-version');
                            if (itemVersion === version) {
                                item.classList.add('selected');
                                const actionsDiv = item.querySelector('.compiler-actions');
                                actionsDiv.innerHTML = `
                                    <span class="status selected-status">已选中</span>
                                    <span class="status downloaded-status">已下载</span>
                                `;
                            } else {
                                item.classList.remove('selected');
                                if (item.classList.contains('downloaded')) {
                                    const actionsDiv = item.querySelector('.compiler-actions');
                                    actionsDiv.innerHTML = `
                                        <button class="select-btn" data-version="${itemVersion}">选择</button>
                                        <span class="status downloaded-status">已下载</span>
                                    `;
                                    const newSelectBtn = actionsDiv.querySelector('.select-btn');
                                    if (newSelectBtn) {
                                        newSelectBtn.addEventListener('click', (e) => {
                                            e.preventDefault();
                                            this.selectTestlib(itemVersion);
                                        });
                                    }
                                }
                            }
                        }
                    });
                } else {
                    throw new Error(result.error || '选择失败');
                }
            }
        } catch (error) {
            logError('选择Testlib失败:', error);
            this.showMessage(`选择失败: ${error.message}`, 'error');
        }
    }

    async setTestlibPath(path) {
        document.getElementById('testlib-path').value = path;

        if (window.electronAPI && window.electronAPI.saveSetting) {
            await window.electronAPI.saveSetting('testlibPath', path);
        }
    }

    async getDownloadedTestlibVersions() {
        try {
            if (window.electronAPI && window.electronAPI.getDownloadedTestlibs) {
                return await window.electronAPI.getDownloadedTestlibs();
            }
        } catch (error) {
            logError('获取已下载Testlib失败:', error);
        }
        return [];
    }

    async isTestlibSelected(version) {
        try {
            if (window.electronAPI && window.electronAPI.isTestlibSelected) {
                return await window.electronAPI.isTestlibSelected(version);
            }
        } catch (error) {
            logError('检查Testlib选择状态失败:', error);
        }
        return false;
    }

    closeWindow() {
        window.close();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new CompilerSettings();
});
