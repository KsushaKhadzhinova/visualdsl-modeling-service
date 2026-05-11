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
    if (toastContainer) {
        toastContainer.appendChild(toast);
    }
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 2800);
}

function updateRunState() {
    previewOutput.innerHTML = '<div class="placeholder">Запустите RUN, чтобы отобразить диаграмму или UDL-дерево.</div>';
}

async function runDiagram() {
    if (!window.editorService) return;
    const code = window.editorService.getValue();
    if (!code || !code.trim()) {
        showToast('Код пустой, пожалуйста, добавьте текст.');
        return;
    }

    try {
        const result = await window.apiService.processDiagram(code, state.engine, state.notation);
        if (result.svg) {
            previewOutput.innerHTML = result.svg;
            showToast('Диаграмма успешно построена.');

            // --- ПРИВЯЗКА BI-SYNC ---
            const svgNodes = previewOutput.querySelectorAll('svg g.node, svg g.class');
            svgNodes.forEach(node => {
                node.style.cursor = 'pointer';
                node.addEventListener('click', () => {
                    const textContent = node.textContent.trim().split('\n')[0];
                    if (!textContent) return;
                    const codeLines = window.editorService.getValue().split('\n');
                    const targetLineIndex = codeLines.findIndex(line => line.includes(textContent));
                    if (targetLineIndex !== -1 && window.biSync) {
                        window.biSync.highlightCodeLine(targetLineIndex + 1);
                    }
                });
            });
        } else if (result.parseTree) {
            previewOutput.innerHTML = `<pre style="padding: 15px; color: var(--text-primary); font-family: var(--font-code);">${escapeHtml(result.parseTree)}</pre>`;
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

    if (!panelConsole) return;
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
        const systemPrompt = `You are an expert in ${state.engine} and ${state.notation} diagram generation. ${mode === 'write' ? 'Generate code based on the description.' : mode === 'refactor' ? 'Refactor the provided code.' : mode === 'fix' ? 'Fix errors in the code.' : 'Answer the documentation question.'}`;
        const fullPrompt = `${systemPrompt}\n\nCurrent code:\n${code}\n\nUser request: ${prompt}`;

        const result = await window.apiService.generateAiResponse(fullPrompt);
        aiResponse.innerHTML = `<pre style="white-space: pre-wrap;">${escapeHtml(result)}</pre>`;
        showToast('AI ответ получен.');
    } catch (error) {
        aiResponse.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
        showToast('Ошибка AI.');
    }
}

function bindEvents() {
    if (engineSelect) engineSelect.addEventListener('change', (e) => state.engine = e.target.value);
    if (notationSelect) notationSelect.addEventListener('change', (e) => state.notation = e.target.value);
    if (btnRun) btnRun.addEventListener('click', runDiagram);

    if (btnAi) btnAi.addEventListener('click', () => {
        if (aiModal) {
            aiModal.showModal();
            if (aiPrompt) aiPrompt.focus();
        }
    });

    if (btnCloseAi) btnCloseAi.addEventListener('click', () => {
        if (aiModal) aiModal.close();
    });

    if (aiForm) aiForm.addEventListener('submit', async(event) => {
        event.preventDefault();
        const modeInput = document.querySelector('input[name="ai-mode"]:checked');
        const mode = modeInput ? modeInput.value : 'write';
        const prompt = aiPrompt.value.trim();
        if (!prompt) {
            showToast('Введите промпт.');
            return;
        }
        await handleAiRequest(mode, prompt);
    });

    if (btnApplyAi) btnApplyAi.addEventListener('click', () => {
        const responseText = aiResponse.textContent.trim();
        if (responseText) {
            window.editorService.setValue(responseText);
            if (aiModal) aiModal.close();
            showToast('Код применен.');
        } else {
            showToast('Нет ответа для применения.');
        }
    });

    if (btnSave) btnSave.addEventListener('click', async() => {
        const currentCode = window.editorService.getValue();
        if (!currentCode || !currentCode.trim()) {
            showToast('Нечего сохранять, код пуст.');
            return;
        }

        localStorage.setItem('visualdsl-code', currentCode);
        showToast('Сохранение в базу данных...');

        try {
            const res = await window.apiService.saveDiagram(currentCode, state.engine, state.notation);
            const time = new Date().toLocaleTimeString().slice(0, 5);
            const pathInfo = document.getElementById('file-path');
            if (pathInfo) pathInfo.textContent = `labs / current_project.vdl (Saved at ${time})`;

            showToast(`Проект сохранён в БД (ID: ${res.id})`);
            if (panelConsole) {
                panelConsole.innerHTML += `<br><span style="color: var(--accent-10)">[Success] Version #${res.id} saved to DB.</span>`;
            }
        } catch (error) {
            console.error(error);
            showToast('Сохранено только локально');
        }
    });

    if (btnTheme) btnTheme.addEventListener('click', () => {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
        showToast(`Тема: ${state.theme}`);
    });

    if (btnExport) btnExport.addEventListener('click', () => {
        const svgElement = previewOutput.querySelector('svg');
        if (!svgElement) {
            const blob = new Blob([window.editorService.getValue()], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'diagram_code.vdl';
            link.click();
            showToast('Экспортирован исходный код.');
            return;
        }

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);
        if (!svgString.match(/^<\?xml/)) {
            svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'diagram_render.svg';
        link.click();
        showToast('Диаграмма экспортирована в SVG!', 'success');
    });

    if (btnImport) btnImport.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async() => {
            if (input.files && input.files[0]) {
                const value = await input.files[0].text();
                window.editorService.setValue(value);
                showToast(`Файл загружен.`);
            }
        };
        input.click();
    });

    sidebarButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const templates = {
                uml_class: 'classDiagram\n    class User {\n        +username: String\n        +email: String\n        +login()\n    }',
                bpmn_process: 'graph LR\n    Start((Start)) --> Step1[Process Order]\n    Step1 --> End((End))',
                petri_net: 'graph LR\n    P1((P1)) --> T1[[T1]]\n    T1 --> P2((P2))',
            };
            window.editorService.setValue(templates[button.dataset.template] || '');
            showToast('Шаблон применен.');
        });
    });

    panelTabs.forEach((tab) => {
        tab.addEventListener('click', () => setActivePanel(tab.dataset.panel));
    });

    // --- ЛОГИКА РЕСАЙЗЕРА ---
    const resizer = document.getElementById('main-resizer');
    const editorPane = document.querySelector('.editor-pane');
    let isResizing = false;

    if (resizer && editorPane) {
        resizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'ns-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const containerRect = editorPane.parentElement.getBoundingClientRect();
            const newHeight = e.clientY - containerRect.top;
            if (newHeight > 100 && newHeight < window.innerHeight - 200) {
                editorPane.style.height = `${newHeight}px`;
                editorPane.style.flex = 'none';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                if (window.editorService && window.editorService.editor) {
                    window.editorService.editor.layout();
                }
            }
        });
    }

    // --- ЛОГИКА ЗУМА ---
    let scale = 1;
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');

    const updateTransform = () => {
        const svg = previewOutput.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${scale})`;
            svg.style.transformOrigin = 'top left';
            svg.style.transition = 'transform 0.2s';
        }
    };

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => { scale += 0.2;
        updateTransform(); });
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => { scale = Math.max(0.2, scale - 0.2);
        updateTransform(); });
}

window.addEventListener('DOMContentLoaded', async() => {
    setTheme(state.theme);
    bindEvents();
    setActivePanel('terminal');

    const savedCode = localStorage.getItem('visualdsl-code') || 'graph TD\n    User([User])\n    App[VisualDSL IDE]';
    try {
        if (window.editorService) {
            await window.editorService.initEditor(savedCode, state.theme);
        }
    } catch (error) {
        if (previewOutput) {
            previewOutput.innerHTML = `<div class="placeholder">${escapeHtml(error.message)}</div>`;
        }
        console.error(error);
    }
});