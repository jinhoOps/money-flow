
// App Flow Controller

// DOM Cache
const els = {
    tabs: document.querySelectorAll('.tab-btn'),
    contents: document.querySelectorAll('.tab-content'),
    
    // Editor List
    nodeList: document.getElementById('editorNodeList'),
    linkList: document.getElementById('editorLinkList'),
    addNodeBtn: document.getElementById('addNodeBtn'),
    addLinkBtn: document.getElementById('addLinkBtn'),
    
    // Modals
    nodeModal: document.getElementById('nodeModal'),
    linkModal: document.getElementById('linkModal'),
    closeNodeModal: document.getElementById('closeNodeModal'),
    closeLinkModal: document.getElementById('closeLinkModal'),
    nodeForm: document.getElementById('nodeForm'),
    linkForm: document.getElementById('linkForm'),
    
    // Modal Inputs
    nodeName: document.getElementById('nodeName'),
    nodeType: document.getElementById('nodeType'),
    nodeValue: document.getElementById('nodeValue'),
    linkSource: document.getElementById('linkSource'),
    linkTarget: document.getElementById('linkTarget'),
    linkAmount: document.getElementById('linkAmount'),

    // Dashboard
    totalNetWorth: document.getElementById('totalNetWorth'),
    monthlyIncome: document.getElementById('totalMonthlyIncome'),
    monthlyInvest: document.getElementById('totalMonthlyInvest'),

    // Flow
    canvas: document.getElementById('flowCanvas'),
    refreshFlowBtn: document.getElementById('refreshFlowBtn'),
    
    // System
    backupBtn: document.getElementById('backupBtn'),
    restoreBtn: document.getElementById('restoreBtn'),
    restoreInput: document.getElementById('restoreInput'),
    currentDate: document.getElementById('currentDate')
};

const formatCurrency = (num) => {
    // 10000 -> 1만
    const manWon = Math.round(num / 10000);
    return new Intl.NumberFormat('ko-KR').format(manWon) + '만';
};

// --- Initialization ---
const init = () => {
    loadData();
    setupEventListeners();
    initCharts();
    renderAll();
};

const STORAGE_KEY = 'money_flow_v2';
const loadData = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        moneyGraph.deserialize(raw);
    } else {
        // Seed default data if empty
        seedDefaultData();
    }
    // Set date
    const today = new Date();
    els.currentDate.textContent = `${today.getFullYear()}.${today.getMonth()+1}.${today.getDate()}`;
};

const seedDefaultData = () => {
    // Example: Salary -> Main -> ISA/Living
    const salary = moneyGraph.addNode('income', '급여', 3500000);
    const main = moneyGraph.addNode('bucket', '급여통장', 0);
    const isa = moneyGraph.addNode('asset', 'ISA 계좌', 25000000);
    const living = moneyGraph.addNode('bucket', '생활비', 1000000);
    const invest = moneyGraph.addNode('asset', '해외주식', 20000000);
    
    moneyGraph.addLink(salary.id, main.id, 3500000);
    moneyGraph.addLink(main.id, isa.id, 1000000); // Monthly contribution example
    saveData();
};

const saveData = () => {
    localStorage.setItem(STORAGE_KEY, moneyGraph.serialize());
    renderAll();
};

// --- Rendering ---
const renderAll = () => {
    renderEditor();
    renderDashboard();
    renderFlow();
};

const renderEditor = () => {
    // Nodes
    els.nodeList.innerHTML = moneyGraph.nodes.map(n => `
        <li>
            <div>
                <strong>${n.name}</strong>
                <span class="subtitle">${n.type} / ${formatCurrency(n.value)}</span>
            </div>
            <div>
                <button class="icon-btn-small" style="display:inline-flex; width:24px; height:24px; margin-right:5px; background:var(--accent-primary);" onclick="editNode(${n.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-btn" onclick="deleteNode(${n.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </li>
    `).join('');

    // Links
    els.linkList.innerHTML = moneyGraph.links.map(l => {
        const s = moneyGraph.nodes.find(n => n.id === l.source)?.name || '?';
        const t = moneyGraph.nodes.find(n => n.id === l.target)?.name || '?';
        return `
            <li>
                <div>
                    <strong>${s} ➜ ${t}</strong>
                    <span class="subtitle">${formatCurrency(l.amount)}</span>
                </div>
                <div>
                    <button class="icon-btn-small" style="display:inline-flex; width:24px; height:24px; margin-right:5px; background:var(--accent-primary);" onclick="editLink(${l.source}, ${l.target})"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-btn" onclick="deleteLink(${l.source}, ${l.target})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    }).join('');
};

const renderDashboard = () => {
    const stats = moneyGraph.calculateFlows();
    
    // Net Worth = Sum of Assets + (Buckets?) -> Let's say Assets only for now, or Assets + Buckets
    // Actually user wants Total Assets.
    let totalAssets = 0;
    moneyGraph.nodes.forEach(n => {
        if (n.type === 'asset' || n.type === 'bucket') {
            totalAssets += n.value;
        }
    });

    els.totalNetWorth.textContent = formatCurrency(totalAssets);
    els.monthlyIncome.textContent = formatCurrency(stats.totalIncome);
    els.monthlyInvest.textContent = formatCurrency(stats.totalInvested);

    updatePortfolioChart(moneyGraph.nodes);
};

// --- Flow Visualization (Canvas) ---
const renderFlow = () => {
    const ctx = els.canvas.getContext('2d');
    const w = els.canvas.parentElement.clientWidth;
    const h = 400; // Fixed height
    els.canvas.width = w;
    els.canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    // Simple auto-layout algorithm
    // Columns: Income (Left) -> Bucket (Center) -> Asset/Expense (Right)
    const columns = {
        income: [],
        bucket: [],
        sink: [] // asset, expense
    };

    moneyGraph.nodes.forEach(n => {
        if (n.type === 'income') columns.income.push(n);
        else if (n.type === 'bucket') columns.bucket.push(n);
        else columns.sink.push(n);
    });

    const colWidth = w / 3;
    const drawNode = (node, colIndex, rowIndex, totalInCol) => {
        const x = colIndex * colWidth + 50; // Margin
        const spacing = h / (totalInCol + 1);
        const y = (rowIndex + 1) * spacing;
        
        node._x = x;
        node._y = y;

        // Draw Circle
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(node.type);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, x, y + 35);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(formatCurrency(node.value), x, y + 50);
    };

    columns.income.forEach((n, i) => drawNode(n, 0, i, columns.income.length));
    columns.bucket.forEach((n, i) => drawNode(n, 1, i, columns.bucket.length));
    columns.sink.forEach((n, i) => drawNode(n, 2, i, columns.sink.length));

    // Draw Links
    moneyGraph.links.forEach(l => {
        const s = moneyGraph.nodes.find(n => n.id === l.source);
        const t = moneyGraph.nodes.find(n => n.id === l.target);
        if (s && t && s._x && t._x) {
            ctx.beginPath();
            ctx.moveTo(s._x + 20, s._y);
            // Bezier curve
            ctx.bezierCurveTo(
                s._x + 100, s._y, 
                t._x - 100, t._y, 
                t._x - 20, t._y
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = Math.max(2, (l.amount / 500000)); // Dynamic width based on amount
            ctx.stroke();

            // Link Label (Amount) - Midpoint
            // Simple approx midpoint
            const midX = (s._x + t._x) / 2;
            const midY = (s._y + t._y) / 2;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(formatCurrency(l.amount), midX, midY);
        }
    });
};

const getNodeColor = (type) => {
    switch(type) {
        case 'income': return '#38bdf8';
        case 'bucket': return '#94a3b8';
        case 'asset': return '#34d399';
        case 'expense': return '#fb7185';
        default: return 'white';
    }
};

// --- Event Listeners ---
const setupEventListeners = () => {
    // Tabs
    els.tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            // Toggle Buttons
            els.tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle Content
            els.contents.forEach(c => {
                c.classList.remove('active');
                if (c.id === target + 'View') {
                   c.classList.add('active');
                   if (c.id === 'dashboardView') updatePortfolioChart(moneyGraph.nodes); // Force chart resize/update
                   if (c.id === 'flowView') renderFlow();
                } else {
                    c.classList.add('hidden'); // Ensure hidden class helper
                    c.style.display = 'none'; // Strong hide
                }
            });
            // Show active
            const active = document.getElementById(target + 'View');
            active.classList.remove('hidden');
            active.style.display = 'block';
        });
    });
    
    // Initial Tab State (Logic fix for the loop above)
    // Simply trigger click on first tab or just ensure visually correct
    // Let's rely on CSS + JS state, force Flow view initially
    els.tabs[0].click();


    // Node Modal
    els.addNodeBtn.addEventListener('click', () => {
        els.nodeForm.reset();
        document.getElementById('nodeId').value = ''; // Clear ID for adding
        els.nodeModal.classList.remove('hidden');
    });
    els.closeNodeModal.addEventListener('click', () => els.nodeModal.classList.add('hidden'));

    els.nodeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('nodeId').value;
        const type = els.nodeType.value;
        const name = els.nodeName.value;
        const val = Number(els.nodeValue.value);
        
        if (id) {
            // Update
            moneyGraph.updateNode(Number(id), { type, name, value: val });
        } else {
            // Add
            moneyGraph.addNode(type, name, val);
        }
        
        saveData();
        els.nodeModal.classList.add('hidden');
    });

    // Link Modal
    els.addLinkBtn.addEventListener('click', () => {
        // Populate Selects
        const opts = moneyGraph.nodes.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
        els.linkSource.innerHTML = opts;
        els.linkTarget.innerHTML = opts;
        
        els.linkForm.reset();
        // Clear logic if we were to support Link ID, but links are key-based for now
        els.linkForm.dataset.mode = 'add'; 
        
        els.linkModal.classList.remove('hidden');
    });
    els.closeLinkModal.addEventListener('click', () => els.linkModal.classList.add('hidden'));

    els.linkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const s = Number(els.linkSource.value);
        const t = Number(els.linkTarget.value);
        const amt = Number(els.linkAmount.value);
        
        if (s === t) { alert('Same source and target!'); return; }
        
        if (els.linkForm.dataset.mode === 'edit') {
             // In edit mode, we might want to update. 
             // But simpler to just overwrite or updateLink using stored S-T
             const oldS = Number(els.linkForm.dataset.oldS);
             const oldT = Number(els.linkForm.dataset.oldT);
             
             if (oldS !== s || oldT !== t) {
                 // If endpoints changed, delete old and add new
                 moneyGraph.deleteLink(oldS, oldT);
                 moneyGraph.addLink(s, t, amt);
             } else {
                 // Update amt
                 moneyGraph.updateLink(s, t, { amount: amt });
             }
        } else {
            moneyGraph.addLink(s, t, amt);
        }
        
        saveData();
        els.linkModal.classList.add('hidden');
    });
    
    els.refreshFlowBtn.addEventListener('click', renderFlow);

    // Global Functions for HTML onclick
    window.deleteNode = (id) => {
        if(confirm('Delete this node?')) {
            moneyGraph.deleteNode(id);
            saveData();
        }
    };
    window.deleteLink = (s, t) => {
        if(confirm('Delete this link?')) {
            moneyGraph.deleteLink(Number(s), Number(t));
            saveData();
        }
    };
    
    window.editNode = (id) => {
        const n = moneyGraph.nodes.find(n => n.id === id);
        if(!n) return;
        
        document.getElementById('nodeId').value = n.id;
        els.nodeName.value = n.name;
        els.nodeType.value = n.type;
        els.nodeValue.value = n.value;
        
        els.nodeModal.classList.remove('hidden');
    };
    
    window.editLink = (s, t) => {
        const l = moneyGraph.links.find(link => link.source === s && link.target === t);
        if(!l) return;
        
        // Populate Selects
        const opts = moneyGraph.nodes.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
        els.linkSource.innerHTML = opts;
        els.linkTarget.innerHTML = opts;
        
        els.linkSource.value = s;
        els.linkTarget.value = t;
        els.linkAmount.value = l.amount;
        
        els.linkForm.dataset.mode = 'edit';
        els.linkForm.dataset.oldS = s;
        els.linkForm.dataset.oldT = t;
        
        els.linkModal.classList.remove('hidden');
    };
};

init();
