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
            // ------------------------
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
    btnSave.addEventListener('click', async() => {
        const currentCode = window.editorService.getValue();
        if (!currentCode.trim()) {
            showToast('Нечего сохранять, код пуст.');
            return;
        }

        // 1. Автосохранение в LocalStorage (защита от потери)
        localStorage.setItem('visualdsl-code', currentCode);
        showToast('Сохранение в базу данных...');

        // 2. Отправка в PostgreSQL/SQLite (через FastAPI)
        try {
            const res = await window.apiService.saveDiagram(currentCode, state.engine, state.notation);

            // Обновляем время в статус-баре
            const time = new Date().toLocaleTimeString().slice(0, 5);
            document.getElementById('last-save-status').textContent = `Last Save: ${time}`;

            showToast(`Проект сохранён в БД (Commit ID: ${res.id})`);

            // Выводим радостный лог в терминал
            panelConsole.innerHTML += `<br><span style="color: var(--success-color)">[Success] Diagram version #${res.id} saved to Database.</span>`;

        } catch (error) {
            console.error(error);
            showToast('Сохранено только локально (Сбой БД)');
            panelConsole.innerHTML += `<br><span style="color: var(--warning-color)">[Warning] DB save failed. LocalStorage used.</span>`;
        }
    });

    btnTheme.addEventListener('click', () => {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
        showToast(`Тема: ${state.theme}`);
    });

    btnExport.addEventListener('click', () => {
        const svgElement = previewOutput.querySelector('svg');
        if (!svgElement) {
            // Если диаграммы нет, скачиваем просто код
            const blob = new Blob([window.editorService.getValue()], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'diagram_code.vdl';
            link.click();
            showToast('Экспортирован исходный код.');
            return;
        }

        // Если диаграмма есть, скачиваем SVG
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);

        // Добавляем XML декларацию
        if (!svgString.match(/^<\?xml/)) {
            svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'diagram_render.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Диаграмма экспортирована в SVG!', 'success');
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

    // Логика Ресайзера панелей (Drag Events)
    const resizer = document.getElementById('main-resizer');
    const editorPane = document.querySelector('.editor-pane');
    let isResizing = false;

    resizer.addEventListener('mousedown', () => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = e.clientX - 54; // Вычитаем ширину Activity Bar
        if (newWidth > 200 && newWidth < window.innerWidth - 300) {
            editorPane.style.flex = 'none';
            editorPane.style.width = `${newWidth}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            if (window.editorService && window.editorService.editor) {
                window.editorService.editor.layout(); // Пересчет сетки Monaco
            }
        }
    });

    // --- Масштабирование и перемещение холста (Zoom & Pan) ---
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDraggingCanvas = false;
    let startX, startY;

    const canvasArea = document.getElementById('preview-output');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');

    const updateTransform = () => {
        // Ищем SVG внутри контейнера и применяем трансформацию
        const svg = canvasArea.querySelector('svg');
        if (svg) {
            svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            svg.style.transformOrigin = 'center';
            svg.style.transition = isDraggingCanvas ? 'none' : 'transform 0.2s';
        }
    };

    btnZoomIn ? .addEventListener('click', () => { scale += 0.2;
        updateTransform(); });
    btnZoomOut ? .addEventListener('click', () => { scale = Math.max(0.2, scale - 0.2);
        updateTransform(); });

    // Перемещение мышкой (Pan)
    canvasArea.addEventListener('mousedown', (e) => {
        if (e.target.tagName !== 'svg' && !e.target.closest('svg')) return;
        isDraggingCanvas = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        canvasArea.style.cursor = 'grabbing';
    });

    canvasArea.addEventListener('mousemove', (e) => {
        if (!isDraggingCanvas) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    canvasArea.addEventListener('mouseup', () => {
        isDraggingCanvas = false;
        canvasArea.style.cursor = 'default';
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