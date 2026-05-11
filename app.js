<<<<<<< HEAD
// Enterprise DSL IDE - Logic Module
// Aligning with vs code and draw.io logic

const state = {
    theme: 'dark',
    currentFile: 'current_project.vdl',
    isResizing: false,
    engine: 'udl',
    templates: {
        uml_class: 'classDiagram\n    class User {\n        +String username\n        +String email\n        +login()\n    }\n    class Database {\n        -query()\n    }\n    User --> Database : "Request Access"',
        bpmn_process: 'graph LR\n    Start((Start)) --> Task1[Process Order]\n    Task1 --> Decision{Payed?}\n    Decision -- No --> Fail[Abort]\n    Decision -- Yes --> Success[Shipment]\n    Success --> End((End))',
        petri_net: 'graph LR\n    P1((Place 1)) --> T1[[Transition 1]]\n    T1 --> P2((Place 2))\n    P2 --> T2[[Transition 2]]\n    T2 --> P1'
    }
};

// DOM Refs
const body = document.body;
const codeEditor = document.getElementById('code-editor');
const resizer = document.getElementById('main-resizer');
const editorPane = document.getElementById('editor-container');
const mermaidView = document.getElementById('mermaid-view');
const toastContainer = document.getElementById('toast-container');
const btnRun = document.getElementById('btn-run');
const btnSave = document.getElementById('btn-save');
const btnTheme = document.getElementById('btn-theme-toggle');
const btnAI = document.getElementById('btn-ai');
const statPos = document.getElementById('stat-pos');

// 1. Initialize Mermaid
function initMermaid(theme = 'dark') {
    mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'neutral',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true }
    });
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
    renderDiagram();
    showToast(`Тема переключена на ${state.theme === 'dark' ? 'Тёмную' : 'Светлую'}`, 'ok');
});

// 4. Rendering Logic (RUN Button)
async function renderDiagram() {
    const code = codeEditor.value;
    if (!code.trim()) return;

    try {
        mermaidView.removeAttribute('data-processed');
        const id = 'diagram-' + Date.now();
        const { svg } = await mermaid.render(id, code);
        mermaidView.innerHTML = svg;
        attachEventsToSVG();
    } catch (err) {
        console.error("Parse error:", err);
        showToast("Ошибка синтаксиса диаграммы", "error");
    }
}

btnRun.addEventListener('click', () => {
    renderDiagram();
    showToast("Диаграмма успешно перестроена", "ok");
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
            node.querySelector('rect, circle, polygon').style.stroke = 'var(--accent-color)';
            node.querySelector('rect, circle, polygon').style.strokeWidth = '3px';
        });

        node.addEventListener('mouseleave', () => {
            resetCodeHighlight();
            node.querySelector('rect, circle, polygon').style.stroke = '';
            node.querySelector('rect, circle, polygon').style.strokeWidth = '';
        });
    });
}

function highlightCode(id) {
    const lines = codeEditor.value.split('\n');
    let targetIndex = -1;
    lines.forEach((line, idx) => {
        if (line.includes(id)) targetIndex = idx;
    });

    if (targetIndex !== -1) {
        // Highlighting simulation (since it's a textarea)
        // In real VS Code we'd use Monaco decorations
        statPos.innerText = `Highlighting Node: ${id}`;
    }
}

function resetCodeHighlight() {
    statPos.innerText = `Ln ${getLineNumber()}, Col ${getColNumber()}`;
}

// 7. Cursor Management
function getLineNumber() {
    return codeEditor.value.substr(0, codeEditor.selectionStart).split("\n").length;
}
function getColNumber() {
    return codeEditor.selectionStart - codeEditor.value.lastIndexOf('\n', codeEditor.selectionStart - 1);
}

codeEditor.addEventListener('keyup', () => {
    statPos.innerText = `Ln ${getLineNumber()}, Col ${getColNumber()}`;
});
codeEditor.addEventListener('mouseup', () => {
    statPos.innerText = `Ln ${getLineNumber()}, Col ${getColNumber()}`;
});

// 8. Template & File Handling
document.querySelectorAll('#template-list button').forEach(btn => {
    btn.onclick = () => {
        const tpl = btn.getAttribute('data-tpl');
        codeEditor.value = state.templates[tpl];
        renderDiagram();
        showToast(`Шаблон ${tpl} применен`, 'ok');
    };
});

btnSave.onclick = () => {
    localStorage.setItem(state.currentFile, codeEditor.value);
    showToast("Проект сохранен локально", "ok");
};

// 9. AI Integration (Mock)
btnAI.onclick = () => {
    showToast("ИИ анализирует проект...", "ok");
    setTimeout(() => {
        const currentCode = codeEditor.value;
        codeEditor.value += "\n    %% AI: Optimized structure recommended\n    App --> User : Feedback";
        renderDiagram();
        showToast("ИИ внес корректировки в код", "ok");
    }, 1500);
};

// Bottom Panel Tab Switching
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('panel-tab--active'));
        tab.classList.add('panel-tab--active');
        const panelName = tab.getAttribute('data-panel');
        const consoleEl = document.getElementById('panel-console');
        
        switch(panelName) {
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
    initMermaid(state.theme);
    renderDiagram();
    showToast("Система готова к работе", "ok");
    
    // Update "Last Saved" periodically
    setInterval(() => {
        const time = new Date().toLocaleTimeString();
        document.getElementById('stat-last-action').innerText = `Activity log: ${time}`;
    }, 10000);
};
=======
node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example
>>>>>>> 182c1d1b6d215898ebd40ae6c59118e6e6bea517
