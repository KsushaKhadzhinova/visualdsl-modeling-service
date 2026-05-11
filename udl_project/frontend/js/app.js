/**
 * Глобальный контроллер приложения VisualDSL IDE
 */

// Элементы управления
const body = document.body;
const engineSelect = document.getElementById('engine-select');
const notationSelect = document.getElementById('notation-select');
const btnRun = document.getElementById('btn-run');
const btnSave = document.getElementById('btn-save');
const btnTheme = document.getElementById('btn-theme-toggle');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnAi = document.getElementById('btn-ai');

// AI Модальное окно
const aiModal = document.getElementById('ai-modal');
const btnCloseAi = document.getElementById('btn-close-ai');
const aiForm = document.getElementById('ai-form');
const aiPrompt = document.getElementById('ai-prompt');
const aiResponse = document.getElementById('ai-response');
const btnApplyAi = document.getElementById('btn-apply-ai');

// Панели вывода
const previewOutput = document.getElementById('preview-output');
const panelConsole = document.getElementById('panel-console');
const toastContainer = document.getElementById('toast-container');

// Состояние приложения
const state = {
    theme: localStorage.getItem('visualdsl-theme') || 'dark',
    engine: 'udl',
    notation: 'none',
};

/**
 * Логирование в "Терминал" IDE
 */
function logToTerminal(message, type = 'info') {
    if (!panelConsole) return;
    const time = new Date().toLocaleTimeString();
    let color = '#858585'; // info
    if (type === 'error') color = '#f44747';
    if (type === 'success') color = '#89d185';
    if (type === 'system') color = '#007acc';

    const logEntry = document.createElement('div');
    logEntry.style.color = color;
    logEntry.innerHTML = `<span style="opacity:0.5">[${time}]</span> ${message}`;
    panelConsole.appendChild(logEntry);
    panelConsole.scrollTop = panelConsole.scrollHeight;
}

/**
 * Переключение темы (Dark/Light)
 */
function setTheme(theme) {
    state.theme = theme;
    // Устанавливаем атрибут на html для работы CSS переменных из :root
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('visualdsl-theme', theme);
    if (window.editorService) {
        window.editorService.setTheme(theme);
    }
    logToTerminal(`Theme switched to ${theme}`, 'system');
}

/**
 * Вспомогательная функция для всплывающих уведомлений
 */
function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

/**
 * Основная функция запуска визуализации (Кнопка RUN)
 */
async function runDiagram() {
    if (!window.editorService) return;
    const code = window.editorService.getValue();

    if (!code || !code.trim()) {
        logToTerminal('Cannot run: Editor is empty.', 'error');
        showToast('Введите код диаграммы');
        return;
    }

    logToTerminal(`Running visualization (Engine: ${state.engine}, Notation: ${state.notation})...`);

    try {
        const result = await window.apiService.processDiagram(code, state.engine, state.notation);

        if (result.svg) {
            previewOutput.innerHTML = result.svg;
            logToTerminal('Visualization rendered successfully.', 'success');

            // Настройка Bi-Sync (связь клика по SVG с кодом)
            const nodes = previewOutput.querySelectorAll('svg g.node, svg g.class, svg g.cluster');
            nodes.forEach(node => {
                node.style.cursor = 'pointer';
                node.addEventListener('click', () => {
                    const text = node.textContent.trim().split('\n')[0];
                    const fullCode = window.editorService.getValue();
                    const lines = fullCode.split('\n');
                    const lineIdx = lines.findIndex(l => l.includes(text));
                    if (lineIdx !== -1 && window.biSync) {
                        window.biSync.highlightCodeLine(lineIdx + 1);
                        logToTerminal(`Sync: Jumped to line ${lineIdx + 1} (${text})`);
                    }
                });
            });
        } else if (result.parseTree) {
            previewOutput.innerHTML = `<pre style="padding:20px; font-family:var(--font-code); color:var(--text-primary);">${escapeHtml(result.parseTree)}</pre>`;
            logToTerminal('UDL Code parsed successfully (Tree generated).', 'success');
        }
    } catch (error) {
        logToTerminal(`Render Error: ${error.message}`, 'error');
        previewOutput.innerHTML = `<div class="placeholder" style="color:#f44747">Error: ${error.message}</div>`;
    }
}

function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Обработка запросов к ИИ
 */
async function handleAiRequest(mode, prompt) {
    logToTerminal('Waiting for AI response...', 'system');
    try {
        const result = await window.apiService.generateAiResponse(prompt);
        aiResponse.innerHTML = `<pre style="white-space:pre-wrap; font-size:12px;">${escapeHtml(result)}</pre>`;
        logToTerminal('AI assistance received.', 'success');
    } catch (error) {
        logToTerminal(`AI Error: ${error.message}`, 'error');
        aiResponse.innerHTML = `<div style="color:#f44747">${error.message}</div>`;
    }
}

/**
 * Привязка событий к интерфейсу
 */
function bindEvents() {
    // Селекторы
    if (engineSelect) engineSelect.onchange = (e) => state.engine = e.target.value;
    if (notationSelect) notationSelect.onchange = (e) => state.notation = e.target.value;

    // Кнопки
    if (btnRun) btnRun.onclick = runDiagram;
    if (btnTheme) btnTheme.onclick = () => setTheme(state.theme === 'dark' ? 'light' : 'dark');

    if (btnSave) btnSave.onclick = async() => {
        const code = window.editorService.getValue();
        logToTerminal('Saving project to database...');
        try {
            const res = await window.apiService.saveDiagram(code, state.engine, state.notation);
            logToTerminal(`Project saved. Revision ID: ${res.id}`, 'success');
            showToast('Сохранено в БД');
        } catch (e) {
            logToTerminal(`Save failed: ${e.message}`, 'error');
        }
    };

    // AI Модалка
    if (btnAi) btnAi.onclick = () => aiModal.showModal();
    if (btnCloseAi) btnCloseAi.onclick = () => aiModal.close();
    if (aiForm) aiForm.onsubmit = async(e) => {
        e.preventDefault();
        const mode = document.querySelector('input[name="ai-mode"]:checked').value;
        const prompt = aiPrompt.value;
        await handleAiRequest(mode, prompt);
    };
    if (btnApplyAi) btnApplyAi.onclick = () => {
        const aiText = aiResponse.textContent;
        if (aiText) {
            window.editorService.setValue(aiText);
            aiModal.close();
            logToTerminal('AI code applied to editor.');
        }
    };

    // --- ЛОГИКА РЕСАЙЗЕРА ---
    const resizer = document.getElementById('main-resizer');
    const editorPane = document.querySelector('.editor-pane');
    let isResizing = false;

    if (resizer && editorPane) {
        resizer.onmousedown = () => { isResizing = true;
            body.style.cursor = 'ns-resize'; };
        document.onmousemove = (e) => {
            if (!isResizing) return;
            // Рассчитываем высоту относительно контейнера
            const container = document.querySelector('.editor-preview-container');
            const topOffset = container.getBoundingClientRect().top;
            const newHeight = e.clientY - topOffset - 40; // 40 - высота тулбара

            if (newHeight > 100 && newHeight < container.clientHeight - 100) {
                editorPane.style.height = `${newHeight}px`;
                editorPane.style.flex = 'none';
                if (window.editorService.editor) window.editorService.editor.layout();
            }
        };
        document.onmouseup = () => { isResizing = false;
            body.style.cursor = 'default'; };
    }

    // --- ЗУМ ПРЕВЬЮ ---
    let scale = 1;
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');

    if (btnIn) btnIn.onclick = () => {
        scale += 0.15;
        const svg = previewOutput.querySelector('svg');
        if (svg) svg.style.transform = `scale(${scale})`;
    };
    if (btnOut) btnOut.onclick = () => {
        scale = Math.max(0.2, scale - 0.15);
        const svg = previewOutput.querySelector('svg');
        if (svg) svg.style.transform = `scale(${scale})`;
    };
}

/**
 * Инициализация при загрузке страницы
 */
window.addEventListener('DOMContentLoaded', async() => {
    // 1. Установка темы
    setTheme(state.theme);

    // 2. Привязка событий
    bindEvents();

    // 3. Загрузка кода и запуск редактора
    const savedCode = localStorage.getItem('visualdsl-code') || '// Welcome to VisualDSL\nclass App {\n  +id: Int\n  +start()\n}';

    try {
        logToTerminal('Initializing Monaco Editor...', 'system');
        await window.editorService.initEditor(savedCode, state.theme);
        logToTerminal('IDE Ready.', 'success');
    } catch (err) {
        logToTerminal(`Editor Init Error: ${err.message}`, 'error');
    }
});