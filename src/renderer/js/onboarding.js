import { BackgroundRender, MeshGradientRenderer } from '@applemusic-like-lyrics/core';

class OnboardingManager {
    constructor() {
        this.overlay = document.getElementById('onboarding-overlay');
        this.currentStep = 0;
        this.theme = 'dark';
        this.settings = {};
        this.isSaving = false;
        this.bound = false;
        this.previewTimer = null;
        this.background = null;
        this.backgroundElement = null;
    }

    async initialize() {
        if (!this.overlay || !window.electronAPI?.getAllSettings) {
            this.releaseStartupGate();
            return;
        }

        await window.i18n?.init?.();
        this.settings = await window.electronAPI.getAllSettings();
        if (this.settings.onboardingCompleted !== false) {
            this.releaseStartupGate();
            return;
        }

        document.getElementById('onboarding-language').value = this.settings.language || 'zh-cn';
        this.theme = this.settings.theme || 'dark';
        this.selectTheme(this.theme, false);
        document.getElementById('onboarding-use-tabs').checked = this.settings.formatterIndentStyle !== 'spaces';
        document.getElementById('onboarding-format-on-save').checked = this.settings.formatOnSave !== false;
        document.getElementById('onboarding-glass-effect').checked = this.settings.glassEffectEnabled !== false;
        document.getElementById('onboarding-auto-save').checked = this.settings.autoSave !== false;
        document.getElementById('onboarding-auto-completion').checked = this.settings.enableAutoCompletion !== false;
        document.getElementById('onboarding-word-wrap').checked = this.settings.wordWrap === true;
        document.getElementById('onboarding-font-size').value = String(this.settings.fontSize || 14);
        document.getElementById('onboarding-tab-size').value = String(this.settings.tabSize || 4);
        this.updateFontSizeLabel();
        const opacityInput = document.getElementById('onboarding-opacity');
        opacityInput.value = String(Math.max(0, Math.min(0.8, 1 - (this.settings.windowOpacity ?? 0.95))));
        this.updateOpacityLabel();
        this.bindEvents();

        this.overlay.hidden = false;
        this.overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('onboarding-active');
        this.releaseStartupGate();
        window.i18n?.applyTranslation?.();
        this.showStep(0);
        try {
            await this.startBackground();
        } catch (error) {
            this.showError(error);
        }
        document.getElementById('onboarding-language').focus();
    }

    releaseStartupGate() {
        document.documentElement.classList.remove('startup-pending');
    }

    async startBackground() {
        const backgroundRoot = document.getElementById('onboarding-background');
        if (!backgroundRoot) {
            throw new Error('初始化背景容器不存在');
        }

        const baseHue = Math.floor(Math.random() * 360);
        const colors = [
            `hsl(${baseHue} 92% 50%)`,
            `hsl(${(baseHue + 92) % 360} 92% 52%)`,
            `hsl(${(baseHue + 188) % 360} 90% 48%)`,
            `hsl(${(baseHue + 276) % 360} 94% 54%)`,
        ];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="100%" height="100%" fill="${colors[0]}"/><path d="M0 0H1000V165C830 245 702 227 550 177C362 114 190 146 0 244Z" fill="${colors[1]}"/><path d="M0 244C190 146 362 114 550 177C702 227 830 245 1000 165V470C822 390 685 412 509 485C310 568 159 548 0 474Z" fill="${colors[2]}"/><path d="M0 474C159 548 310 568 509 485C685 412 822 390 1000 470V700H0Z" fill="${colors[3]}"/></svg>`;
        const album = new Image();
        album.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        await album.decode();

        const renderer = BackgroundRender.new(MeshGradientRenderer);
        const element = renderer.getElement();
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.display = 'block';
        backgroundRoot.appendChild(element);
        this.backgroundElement = element;

        renderer.setFPS(30);
        renderer.setRenderScale(0.65);
        renderer.setHasLyric(false);
        renderer.setFlowSpeed(4);
        renderer.setStaticMode(false);
        this.background = renderer;

        try {
            await renderer.setAlbum(album, false);
            renderer.resume();
        } catch (error) {
            this.disposeBackground();
            throw error;
        }
    }

    disposeBackground() {
        if (!this.background) return;
        this.background.pause();
        this.background.dispose();
        this.backgroundElement?.remove();
        this.backgroundElement = null;
        this.background = null;
    }

    bindEvents() {
        if (this.bound) return;
        this.bound = true;
        document.getElementById('onboarding-next').addEventListener('click', () => this.next());
        document.getElementById('onboarding-back').addEventListener('click', () => this.showStep(this.currentStep - 1));
        document.getElementById('onboarding-opacity').addEventListener('input', () => {
            this.updateOpacityLabel();
            this.schedulePreview();
        });
        document.getElementById('onboarding-language').addEventListener('change', () => {
            this.previewLanguage().catch((error) => this.showError(error));
        });
        document.querySelectorAll('[data-theme-choice]').forEach((button) => {
            button.addEventListener('click', () => this.selectTheme(button.dataset.themeChoice));
        });
        [
            'onboarding-use-tabs',
            'onboarding-format-on-save',
            'onboarding-glass-effect',
            'onboarding-auto-save',
            'onboarding-auto-completion',
            'onboarding-word-wrap',
            'onboarding-font-size',
            'onboarding-tab-size',
        ].forEach((id) => {
            document.getElementById(id).addEventListener('change', () => this.schedulePreview());
        });
        document.getElementById('onboarding-font-size').addEventListener('input', () => {
            this.updateFontSizeLabel();
            this.schedulePreview();
        });
        this.overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') event.preventDefault();
            if (event.key !== 'Tab') return;
            const focusable = Array.from(this.overlay.querySelectorAll('button:not(:disabled), select, input')).filter(
                (element) => !element.closest('[hidden]')
            );
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    selectTheme(theme, preview = true) {
        this.theme = theme === 'light' ? 'light' : 'dark';
        this.overlay.dataset.theme = this.theme;
        document.querySelectorAll('[data-theme-choice]').forEach((button) => {
            const selected = button.dataset.themeChoice === this.theme;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        if (preview) this.schedulePreview();
    }

    showStep(step) {
        this.currentStep = Math.max(0, Math.min(3, step));
        this.overlay.querySelectorAll('[data-onboarding-step]').forEach((panel) => {
            panel.hidden = Number(panel.dataset.onboardingStep) !== this.currentStep;
        });
        this.overlay.querySelectorAll('.onboarding-progress-segment').forEach((segment, index) => {
            segment.classList.toggle('is-active', index <= this.currentStep);
        });
        document.getElementById('onboarding-step-count').textContent = `${this.currentStep + 1} / 4`;
        document.getElementById('onboarding-back').hidden = this.currentStep === 0;

        const nextButton = document.getElementById('onboarding-next');
        const key =
            this.currentStep === 0
                ? 'onboarding.start'
                : this.currentStep === 3
                  ? 'onboarding.finish'
                  : 'onboarding.next';
        nextButton.dataset.i18n = key;
        nextButton.textContent =
            window.i18n?.t(key) || (this.currentStep === 3 ? '开始使用' : this.currentStep === 0 ? '开始设置' : '继续');
        document.getElementById('onboarding-error').hidden = true;
        this.overlay.querySelector(`[data-onboarding-step="${this.currentStep}"]`)?.classList.remove('is-entering');
        requestAnimationFrame(() => {
            this.overlay.querySelector(`[data-onboarding-step="${this.currentStep}"]`)?.classList.add('is-entering');
        });
        if (this.currentStep === 1) document.getElementById('onboarding-language').focus();
        if (this.currentStep === 2) document.getElementById('onboarding-use-tabs').focus();
        if (this.currentStep === 3) document.getElementById('onboarding-font-size').focus();
    }

    next() {
        if (this.isSaving) return;
        if (this.currentStep < 3) {
            this.showStep(this.currentStep + 1);
            return;
        }
        this.finish();
    }

    updateOpacityLabel() {
        const value = Number(document.getElementById('onboarding-opacity').value);
        document.getElementById('onboarding-opacity-value').textContent = `${Math.round(value * 100)}%`;
    }

    updateFontSizeLabel() {
        document.getElementById('onboarding-font-size-value').textContent =
            `${document.getElementById('onboarding-font-size').value}px`;
    }

    readPreferences() {
        const useTabs = document.getElementById('onboarding-use-tabs').checked;
        return {
            language: document.getElementById('onboarding-language').value,
            theme: this.theme,
            formatterIndentStyle: useTabs ? 'tabs' : 'spaces',
            clangFormatStyle: {
                ...(this.settings.clangFormatStyle || {}),
                UseTab: useTabs ? 'Always' : 'Never',
                TabWidth: Number(document.getElementById('onboarding-tab-size').value),
                IndentWidth: Number(document.getElementById('onboarding-tab-size').value),
            },
            clangFormatRaw: '',
            formatOnSave: document.getElementById('onboarding-format-on-save').checked,
            glassEffectEnabled: document.getElementById('onboarding-glass-effect').checked,
            autoSave: document.getElementById('onboarding-auto-save').checked,
            enableAutoCompletion: document.getElementById('onboarding-auto-completion').checked,
            wordWrap: document.getElementById('onboarding-word-wrap').checked,
            fontSize: Number(document.getElementById('onboarding-font-size').value),
            tabSize: Number(document.getElementById('onboarding-tab-size').value),
            windowOpacity: 1 - Number(document.getElementById('onboarding-opacity').value),
        };
    }

    async previewLanguage() {
        const language = document.getElementById('onboarding-language').value;
        await window.i18n?.setLanguage?.(language);
        this.schedulePreview();
    }

    schedulePreview() {
        clearTimeout(this.previewTimer);
        this.previewTimer = window.setTimeout(() => {
            const preview = this.readPreferences();
            if (typeof window.electronAPI?.sendSettingsPreview !== 'function') {
                this.showError(new Error('Settings preview is unavailable'));
                return;
            }
            window.electronAPI.sendSettingsPreview(preview);
        }, 80);
    }

    async finish() {
        if (this.isSaving) return;
        this.isSaving = true;
        const nextButton = document.getElementById('onboarding-next');
        const backButton = document.getElementById('onboarding-back');
        nextButton.disabled = true;
        backButton.disabled = true;

        try {
            clearTimeout(this.previewTimer);
            const preferences = this.readPreferences();
            const result = await window.electronAPI.updateSettings({
                ...preferences,
                onboardingCompleted: true,
            });
            if (!result || result.success !== true) {
                throw new Error(result?.error || 'Settings could not be saved');
            }

            this.settings = { ...this.settings, ...preferences, onboardingCompleted: true };
            window.oicppApp?.applySettings?.(null, this.settings);
            document.dispatchEvent(new CustomEvent('settings-applied', { detail: this.settings }));
            this.overlay.classList.add('is-closing');
            let closeTimer;
            const finishClosing = () => {
                if (!this.overlay || this.overlay.hidden) return;
                clearTimeout(closeTimer);
                this.overlay.removeEventListener('transitionend', handleTransitionEnd);
                this.disposeBackground();
                this.overlay.hidden = true;
                this.overlay.setAttribute('aria-hidden', 'true');
                this.overlay.classList.remove('is-closing');
                document.body.classList.remove('onboarding-active');
            };
            const handleTransitionEnd = (event) => {
                if (event.target === this.overlay && event.propertyName === 'opacity') {
                    finishClosing();
                }
            };
            this.overlay.addEventListener('transitionend', handleTransitionEnd);
            closeTimer = window.setTimeout(finishClosing, 900);
        } catch (error) {
            this.showError(error);
            this.isSaving = false;
            nextButton.disabled = false;
            backButton.disabled = false;
        }
    }

    showError(error) {
        logError('[初始化向导] 设置预览或保存失败:', error);
        const errorMessage = document.getElementById('onboarding-error');
        errorMessage.textContent = window.i18n?.t('onboarding.saveError') || `设置应用失败：${error.message}`;
        errorMessage.hidden = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.onboardingManager = new OnboardingManager();
});
