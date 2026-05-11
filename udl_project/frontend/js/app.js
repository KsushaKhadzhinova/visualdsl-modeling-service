const body = document.body;
const engineSelect = document.getElementById('engine-select');
const notationSelect = document.getElementById('notation-select');
const btnRun = document.getElementById('btn-run');
const btnSave = document.getElementById('btn-save');
const btnTheme = document.getElementById('btn-theme-toggle');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnAi = document.getElementById('btn-ai');
const aiModal = document.getElementById('ai-modal');
const btnCloseAi = document.getElementById('btn-close-ai');
const aiForm = document.getElementById('ai-form');
const aiPrompt = document.getElementById('ai-prompt');
const aiResponse = document.getElementById('ai-response');
const btnApplyAi = document.getElementById('btn-apply-ai');
const previewOutput = document.getElementById('preview-output');
const panelConsole = document.getElementById('panel-console');
const toastContainer = document.getElementById('toast-container');
const sidebarButtons = document.querySelectorAll('.sidebar-item');
const panelTabs = document.querySelectorAll('.panel-tab');

const state = {
    theme: localStorage.getItem('visualdsl-theme') || 'dark',
    engine: 'udl',
    notation: 'none',
};

function setTheme(theme) {
    state.theme = theme;
    body.setAttribute('data-theme', theme);
    localStorage.setItem('visualdsl-theme', theme);
    if (window.editorService) {
        window.editorService.setTheme(theme);
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function updateRunState() {
    previewOutput.innerHTML = '<div class="placeholder">Запустите RUN, чтобы отобразить диаграмму или UDL-дерево.</div>';
}

async function runDiagram() {
    const code = window.editorService.getValue();
    if (!code.trim()) {
        showToast('Код пустой, пожалуйста, добавьте текст.');
        return;
    }

    try {
        const result = await window.apiService.processDiagram(code, state.engine, state.notation);
        if (result.svg) {
            previewOutput.innerHTML = result.svg;
            showToast('Диаграмма успешно построена.');
        } else if (result.parseTree) {
            previewOutput.innerHTML = `<pre>${escapeHtml(result.parseTree)}</pre>`;
            showToast('UDL успешно распарсен.');
        } else {
            previewOutput.innerHTML = '<div class="placeholder">Сервер вернул неизвестный ответ.</div>';
        }
    } catch (error) {
        previewOutput.innerHTML = `<div class="placeholder">${escapeHtml(error.message)}</div>`;
        showToast('Ошибка при обработке.');
    }
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function setActivePanel(panelName) {
    panelTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.panel === panelName);
    });

    switch (panelName) {
        case 'terminal':
            panelConsole.textContent = '[system] Terminal attached.\n$';
            break;
        case 'problems':
            panelConsole.textContent = 'No problems detected in current workspace.';
            break;
        case 'output':
            panelConsole.textContent = '[info] Last run completed.';
            break;
    }
}

async function handleAiRequest(mode, prompt) {
    try {
        const code = window.editorService.getValue();
        const engine = state.engine;
        const notation = state.notation;

        const systemPrompt = `You are an expert in ${engine} and ${notation} diagram generation. ${mode === 'write' ? 'Generate code based on the description.' : mode === 'refactor' ? 'Refactor the provided code.' : mode === 'fix' ? 'Fix errors in the code.' : 'Answer the documentation question.'}`;

        const fullPrompt = `${systemPrompt}\n\nCurrent code:\n${code}\n\nUser request: ${prompt}`;

        const result = await window.apiService.generateAiResponse(fullPrompt);
        aiResponse.innerHTML = `<pre>${escapeHtml(result)}</pre>`;
        showToast('AI ответ получен.');
    } catch (error) {
        aiResponse.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
        showToast('Ошибка AI.');
    }
}

function bindEvents() {
    engineSelect.addEventListener('change', (event) => {
        state.engine = event.target.value;
    });

    notationSelect.addEventListener('change', (event) => {
        state.notation = event.target.value;
    });

    btnRun.addEventListener('click', runDiagram);

    btnAi.addEventListener('click', () => {
        aiModal.showModal();
        aiPrompt.focus();
    });

    btnCloseAi.addEventListener('click', () => {
        aiModal.close();
    });

    aiForm.addEventListener('submit', async(event) => {
        event.preventDefault();
        const mode = document.querySelector('input[name="ai-mode"]:checked').value;
        const prompt = aiPrompt.value.trim();
        if (!prompt) {
            showToast('Введите промпт.');
            return;
        }
        await handleAiRequest(mode, prompt);
    });
    btnApplyAi.addEventListener('click', () => {
        const responseText = aiResponse.textContent.trim();
        if (responseText) {
            window.editorService.setValue(responseText);
            aiModal.close();
            showToast('Код применен.');
        } else {
            showToast('Нет ответа для применения.');
        }
    });
    btnSave.addEventListener('click', () => {
        localStorage.setItem('visualdsl-code', window.editorService.getValue());
        showToast('Код сохранён.');
    });

    btnTheme.addEventListener('click', () => {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
        showToast(`Тема: ${state.theme}`);
    });

    btnExport.addEventListener('click', () => {
        const blob = new Blob([window.editorService.getValue()], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'visualdsl.vdl';
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Экспорт выполнен.');
    });

    btnImport.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vdl,.txt';
        input.onchange = async() => {
            const file = input.files ? .[0];
            if (!file) return;
            const value = await file.text();
            window.editorService.setValue(value);
            showToast(`Файл ${file.name} загружен.`);
        };
        input.click();
    });

    sidebarButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const template = button.dataset.template;
            const templates = {
                uml_class: 'classDiagram\n    class User {\n        +username: String\n        +email: String\n        +login()\n    }',
                bpmn_process: 'graph LR\n    Start((Start)) --> Step1[Process Order]\n    Step1 --> Decision{Paid?}\n    Decision -- Yes --> End((End))\n    Decision -- No --> Cancel((Cancel))',
                petri_net: 'graph LR\n    P1((P1)) --> T1[[T1]]\n    T1 --> P2((P2))',
            };
            window.editorService.setValue(templates[template] || '');
            showToast('Шаблон применен.');
        });
    });

    panelTabs.forEach((tab) => {
        tab.addEventListener('click', () => setActivePanel(tab.dataset.panel));
    });
}

window.addEventListener('DOMContentLoaded', async() => {
    setTheme(state.theme);
    bindEvents();
    setActivePanel('terminal');

    const savedCode = localStorage.getItem('visualdsl-code') || 'graph TD\n    User([User])\n    App[VisualDSL IDE]';
    try {
        await window.editorService.initEditor(savedCode, state.theme);
    } catch (error) {
        previewOutput.innerHTML = `<div class="placeholder">${escapeHtml(error.message)}</div>`;
        console.error(error);
    }
});