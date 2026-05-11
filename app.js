// Enterprise DSL IDE - Logic Module
// Aligning with VS Code and draw.io logic

const state = {
    theme: 'dark',
    currentFile: 'current_project.vdl',
    isResizing: false,
    engine: 'udl',
    notation: 'none',
    templates: {
        uml_class: 'classDiagram\n    class User {\n        +String username\n        +String email\n        +login()\n    }\n    class Database {\n        -query()\n    }\n    User --> Database : "Request Access"',
        bpmn_process: 'graph LR\n    Start((Start)) --> Task1[Process Order]\n    Task1 --> Decision{Payed?}\n    Decision -- No --> Fail[Abort]\n    Decision -- Yes --> Success[Shipment]\n    Success --> End((End))',
        petri_net: 'graph LR\n    P1((Place 1)) --> T1[[Transition 1]]\n    T1 --> P2((Place 2))\n    P2 --> T2[[Transition 2]]\n    T2 --> P1'
    }
};

// DOM Refs
const body = document.body;
const resizer = document.getElementById('main-resizer');
const editorPane = document.getElementById('editor-container');
const monacoEditorContainer = document.getElementById('monaco-editor-container');
const mermaidView = document.getElementById('mermaid-view');
const toastContainer = document.getElementById('toast-container');
const btnRun = document.getElementById('btn-run');
const btnSave = document.getElementById('btn-save');
const btnTheme = document.getElementById('btn-theme-toggle');
const btnAI = document.getElementById('btn-ai');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnDocs = document.getElementById('btn-docs');
const engineSelect = document.getElementById('engine-select');
const notationSelect = document.getElementById('notation-select');
const aiModal = document.getElementById('ai-modal');
const aiModeSelect = document.getElementById('ai-mode-select');
const aiApply = document.getElementById('ai-apply');
const aiCancel = document.getElementById('ai-cancel');
const statPos = document.getElementById('stat-pos');
let monacoEditor = null;
let currentDecorations = [];

if (engineSelect) {
    engineSelect.value = state.engine;
    engineSelect.addEventListener('change', (event) => {
        state.engine = event.target.value;
        showToast(`Engine: ${state.engine}`, 'ok');
    });
}

if (notationSelect) {
    notationSelect.value = state.notation;
    notationSelect.addEventListener('change', (event) => {
        state.notation = event.target.value;
        showToast(`Notation: ${state.notation}`, 'ok');
    });
}

const initialEditorCode = `graph TD
    User([User])
    App[VisualDSL IDE]
    DB[(Database)]
    AI{AI Engine}

    User -- "Writes DSL" --> App
    App -- "Parses" --> AI
    AI -- "DSL Snippet" --> App
    App -- "Stores" --> DB
    App -- "Renders" --> View[SVG Preview]`;

// 1. Initialize Mermaid
function initMermaid(theme = 'dark') {
    mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'neutral',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true }
    });
}

function initializeMonaco(callback) {
    if (!monacoEditorContainer) {
        callback ? .();
        return;
    }

    if (typeof require === 'undefined') {
        showToast('Require.js не загружен, Monaco Editor не инициализирован.', 'error');
        callback ? .();
        return;
    }

    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
        monacoEditor = monaco.editor.create(monacoEditorContainer, {
            value: initialEditorCode,
            language: 'plaintext',
            theme: state.theme === 'dark' ? 'vs-dark' : 'vs',
            automaticLayout: true,
            minimap: { enabled: false },
            fontFamily: 'Fira Code, monospace',
            fontSize: 13,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
        });

        monacoEditor.onDidChangeModelContent(updateCursorPosition);
        monacoEditor.onDidChangeCursorPosition(updateCursorPosition);
        updateCursorPosition();
        callback ? .();
    });
}

function getEditorValue() {
    return monacoEditor ? monacoEditor.getValue() : initialEditorCode;
}

function setEditorValue(value) {
    if (monacoEditor) {
        monacoEditor.setValue(value);
    }
}

function getLineNumber() {
    if (monacoEditor) {
        return monacoEditor.getPosition() ? .lineNumber || 1;
    }
    return 1;
}

function getColNumber() {
    if (monacoEditor) {
        return monacoEditor.getPosition() ? .column || 1;
    }
    return 1;
}

function updateCursorPosition() {
    statPos.innerText = `Ln ${getLineNumber()}, Col ${getColNumber()}`;
}

// 2. Resizer Logic
resizer.addEventListener('mousedown', (e) => {
    state.isResizing = true;
    body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
    if (!state.isResizing) return;
    const offset = e.clientX - 48; // Activity bar width
    if (offset > 150 && offset < window.innerWidth - 200) {
        editorPane.style.flex = `0 0 ${offset}px`;
    }
});

document.addEventListener('mouseup', () => {
    state.isResizing = false;
    body.style.cursor = 'default';
});

// 3. Theme Toggle
btnTheme.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', state.theme);
    initMermaid(state.theme);
    if (monacoEditor) {
        monaco.editor.setTheme(state.theme === 'dark' ? 'vs-dark' : 'vs');
    }
    renderDiagram();
    showToast(`Тема переключена на ${state.theme === 'dark' ? 'Тёмную' : 'Светлую'}`, 'ok');
});

// 4. Rendering Logic (RUN Button)
async function renderDiagram() {
    const code = getEditorValue();
    if (!code.trim()) return;

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                engine: state.engine,
                notation: state.notation,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || 'Ошибка обработки на сервере');
        }

        const json = await response.json();
        if (json.svg) {
            mermaidView.innerHTML = json.svg;
            attachEventsToSVG();
            showToast('Диаграмма успешно построена', 'ok');
            return;
        }

        if (json.parseTree) {
            mermaidView.innerHTML = `<pre class="diagram-text">${escapeHtml(json.parseTree)}</pre>`;
            showToast('UDL успешно распарсен', 'ok');
            return;
        }

        showToast('Ответ сервера не содержит визуализацию', 'error');
    } catch (err) {
        console.error('Render error:', err);
        showToast(err.message || 'Ошибка построения диаграммы', 'error');
    }
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

btnRun.addEventListener('click', () => {
    renderDiagram();
});

btnExport.addEventListener('click', () => {
    const blob = new Blob([getEditorValue()], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = state.currentFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Файл экспортирован', 'ok');
});

btnImport.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vdl,.txt';
    input.onchange = async() => {
        const file = input.files ? .[0];
        if (!file) return;
        const content = await file.text();
        setEditorValue(content);
        renderDiagram();
        showToast(`Файл ${file.name} загружен`, 'ok');
    };
    input.click();
});

btnDocs.addEventListener('click', () => {
    showToast('Открытие документации...', 'ok');
    window.open('https://example.com/docs', '_blank');
});

// 5. Toast System
function showToast(text, type = 'ok') {
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerText = text;
    toastContainer.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
    }, 3000);
}

// 6. Interactive Highlighting (Sync)
function attachEventsToSVG() {
    const nodes = mermaidView.querySelectorAll('.node');
    nodes.forEach(node => {
        node.style.cursor = 'pointer';

        node.addEventListener('mouseenter', () => {
            const nodeId = node.id.split('-')[1] || node.id;
            highlightCode(nodeId);
            const shape = node.querySelector('rect, circle, polygon');
            if (shape) {
                shape.style.stroke = 'var(--accent-color)';
                shape.style.strokeWidth = '3px';
            }
        });

        node.addEventListener('mouseleave', () => {
            resetCodeHighlight();
            const shape = node.querySelector('rect, circle, polygon');
            if (shape) {
                shape.style.stroke = '';
                shape.style.strokeWidth = '';
            }
        });
    });
}

function highlightCode(id) {
    const code = getEditorValue();
    const lines = code.split('\n');
    let targetIndex = -1;

    lines.forEach((line, idx) => {
        if (line.includes(id)) targetIndex = idx;
    });

    if (targetIndex !== -1) {
        statPos.innerText = `Highlighting Node: ${id}`;
        if (monacoEditor) {
            const startLine = targetIndex + 1;
            currentDecorations = monacoEditor.deltaDecorations(currentDecorations, [{
                range: new monaco.Range(startLine, 1, startLine, 1),
                options: {
                    isWholeLine: true,
                    className: 'line-highlight'
                }
            }]);
            monacoEditor.revealLineInCenter(startLine);
        }
    }
}

function resetCodeHighlight() {
    if (monacoEditor) {
        currentDecorations = monacoEditor.deltaDecorations(currentDecorations, []);
    }
    statPos.innerText = `Ln ${getLineNumber()}, Col ${getColNumber()}`;
}

// 7. Cursor Management
function getLineNumber() {
    if (monacoEditor) {
        return monacoEditor.getPosition() ? .lineNumber || 1;
    }
    return 1;
}

function getColNumber() {
    if (monacoEditor) {
        return monacoEditor.getPosition() ? .column || 1;
    }
    return 1;
}

function updateCursorPosition() {
    statPos.innerText = `Ln ${getLineNumber()}, Col ${getColNumber()}`;
}

btnAI.addEventListener('click', () => {
    if (aiModal) {
        aiModal.showModal();
    } else {
        showToast('ИИ анализирует проект...', 'ok');
        setTimeout(() => {
            setEditorValue(`${getEditorValue()}\n    %% AI: Optimized structure recommended\n    App --> User : Feedback`);
            renderDiagram();
            showToast('ИИ внес корректировки в код', 'ok');
        }, 1500);
    }
});

aiCancel ? .addEventListener('click', () => aiModal.close());
aiApply ? .addEventListener('click', () => {
    const mode = aiModeSelect.value;
    aiModal.close();
    showToast(`ИИ режим: ${aiModeSelect.selectedOptions[0].text}`, 'ok');
    let extra = '';

    if (mode === 'write') {
        extra = '\n%% AI: Пишет новый код...';
    } else if (mode === 'fix') {
        extra = '\n%% AI: Исправляет код...';
    } else if (mode === 'explain') {
        extra = '\n%% AI: Объясняет структуру...';
    }

    setEditorValue(`${getEditorValue()}${extra}`);
    renderDiagram();
});

// 8. Template & File Handling
document.querySelectorAll('#template-list button').forEach(btn => {
    btn.onclick = () => {
        const tpl = btn.getAttribute('data-tpl');
        setEditorValue(state.templates[tpl]);
        renderDiagram();
        showToast(`Шаблон ${tpl} применен`, 'ok');
    };
});

btnSave.onclick = () => {
    localStorage.setItem(state.currentFile, getEditorValue());
    showToast('Проект сохранен локально', 'ok');
};

// Bottom Panel Tab Switching
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('panel-tab--active'));
        tab.classList.add('panel-tab--active');
        const panelName = tab.getAttribute('data-panel');
        const consoleEl = document.getElementById('panel-console');

        switch (panelName) {
            case 'terminal':
                consoleEl.innerText = "[system] Terminal attached.\n$ _";
                break;
            case 'problems':
                consoleEl.innerText = "No problems detected in current workspace.";
                break;
            case 'output':
                consoleEl.innerText = "[info] Mermaid.js Render Successful (34ms)\n[info] LocalStorage sync: active";
                break;
        }
    };
});

// Sidebar Category Collapse Logic (Standard VS Code)
document.querySelectorAll('.folder-name').forEach(fn => {
    fn.onclick = () => {
        const list = fn.nextElementSibling;
        const arrow = fn.querySelector('svg');
        if (list.style.display === 'none') {
            list.style.display = 'block';
            arrow.style.transform = 'rotate(0deg)';
        } else {
            list.style.display = 'none';
            arrow.style.transform = 'rotate(-90deg)';
        }
    };
});

// Initial Boot
window.onload = () => {
    initializeMonaco(() => {
        initMermaid(state.theme);
        renderDiagram();
        showToast('Система готова к работе', 'ok');

        // Update "Last Saved" periodically
        setInterval(() => {
            const time = new Date().toLocaleTimeString();
            document.getElementById('stat-last-action').innerText = `Activity log: ${time}`;
        }, 10000);
    });
};