
// DOM Elements
const els = {
    totalAssets: document.getElementById('totalAssetsValue'),
    monthlyChange: document.getElementById('monthlyChange'),
    netFlowDisplay: document.getElementById('netFlowValue'),
    dopamineGauge: document.getElementById('dopamineGauge'),
    dopaminePercent: document.getElementById('dopaminePercent'),
    dopamineStatus: document.getElementById('dopamineStatus'),
    actionContent: document.getElementById('actionContent'),
    
    // Account Summaries
    isaTotal: document.getElementById('isaTotal'),
    isaRatio: document.getElementById('isaRatio'),
    overseasTotal: document.getElementById('overseasTotal'),
    overseasRatio: document.getElementById('overseasRatio'),
    dopamineTotal: document.getElementById('dopamineTotal'),
    dopamineRatio: document.getElementById('dopamineRatio'),
    
    // Modal & Form
    modal: document.getElementById('inputModal'),
    openBtn: document.getElementById('openInputBtn'),
    closeBtn: document.getElementById('closeInputBtn'),
    form: document.getElementById('monthForm'),
    
    // Form Inputs
    date: document.getElementById('recordDate'),
    isaEval: document.getElementById('isaEval'),
    isaCash: document.getElementById('isaCash'),
    ovsEval: document.getElementById('ovsEval'),
    ovsCash: document.getElementById('ovsCash'),
    dopaEval: document.getElementById('dopaEval'),
    dopaCash: document.getElementById('dopaCash'),
    netFlow: document.getElementById('netFlow'),

    // History
    historyList: document.getElementById('historyList'),
    currentDate: document.getElementById('currentDate'),
    
    // Backup
    backupBtn: document.getElementById('backupBtn'),
    restoreBtn: document.getElementById('restoreBtn'),
    restoreInput: document.getElementById('restoreInput')
};

// Utilities
const formatCurrency = (num) => {
    // Divide by 10,000 and round to nearest integer
    const manWon = Math.round(num / 10000);
    return new Intl.NumberFormat('ko-KR').format(manWon) + '만';
};

// State Management
let financialData = [];
const STORAGE_KEY = 'wealth_core_data';

const loadData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        financialData = JSON.parse(stored);
        // Sort by date descending
        financialData.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    updateDashboard();
};

const saveData = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(financialData));
    updateDashboard();
};

// Core Logic
const calculateStats = (entry) => {
    const isa = entry.isa.eval + entry.isa.cash;
    const ovs = entry.overseas.eval + entry.overseas.cash;
    const dopa = entry.dopamine.eval + entry.dopamine.cash;
    
    const total = isa + ovs + dopa;
    
    return {
        total,
        isa,
        ovs,
        dopa,
        isaRatio: (isa / total) * 100,
        ovsRatio: (ovs / total) * 100,
        dopaRatio: (dopa / total) * 100
    };
};

const getActions = (stats, prevStats, netFlow) => {
    const actions = [];
    const dopaPct = stats.dopaRatio;

    // 1. Dopamine Rules
    if (dopaPct > 12) {
        actions.push({
            type: 'stop',
            text: `⚠️ **도파민 비중 경고 (${dopaPct.toFixed(1)}%)**: 목표 10%를 크게 초과했습니다. 이번 달 도파민 계좌 신규 납입을 **전면 중지**하세요.`,
            critical: true
        });
        actions.push({
            type: 'trim',
            text: `✂️ **익절 고려**: 가능하자면 일부 도파민 자산을 매도하여 예수금으로 전환하거나 코어 자산으로 이동시키세요.`
        });
    } else if (dopaPct > 10) {
        actions.push({
            type: 'warn',
            text: `✋ **도파민 비중 주의 (${dopaPct.toFixed(1)}%)**: 10%를 넘었습니다. 추가 투입을 자제하고 자연 희석되도록 두세요.`
        });
    } else if (dopaPct < 8) {
        actions.push({
            type: 'info',
            text: `📉 **도파민 비중 낮음 (${dopaPct.toFixed(1)}%)**: 무리해서 채울 필요 없습니다. 정말 확실한 기회가 있을 때만 진입하세요.`
        });
    } else {
        actions.push({
            type: 'ok',
            text: `✅ **도파민 비중 양호**: 현재 ${dopaPct.toFixed(1)}%로 적절합니다. 규칙 내에서 자유롭게 운용하세요.`
        });
    }

    // 2. Core Balancing
    actions.push({
        type: 'core',
        text: `💰 **코어 자산**: 남은 생활비와 ISA 고정 납입금은 전액 코어(ISA/해외)에 집중하세요.`
    });

    return actions;
};

// UI Updates
const updateDashboard = () => {
    if (financialData.length === 0) {
        els.actionContent.innerHTML = '<p style="padding:10px;">데이터가 없습니다. "월간 데이터 기록하기"를 눌러 첫 기록을 시작하세요.</p>';
        return;
    }

    const latest = financialData[0];
    const prev = financialData.length > 1 ? financialData[1] : null;
    const stats = calculateStats(latest);
    const prevStats = prev ? calculateStats(prev) : null;

    // 1. Header Date
    els.currentDate.textContent = `기준일: ${latest.date}`;

    // 2. Total Assets
    els.totalAssets.textContent = formatCurrency(stats.total);

    // 2.1 Net Flow
    els.netFlowDisplay.textContent = formatCurrency(latest.netFlow);

    // Change?
    if (prevStats) {
        const diff = stats.total - prevStats.total;
        const sign = diff >= 0 ? '+' : '';
        els.monthlyChange.innerHTML = `${sign}${formatCurrency(diff)}원 (전월 대비)`;
        els.monthlyChange.style.color = diff >= 0 ? 'var(--accent-success)' : 'var(--accent-dopamine)';
    } else {
        els.monthlyChange.textContent = "첫 기록 시작";
    }

    // 3. Dopamine Gauge
    els.dopamineGauge.style.width = `${Math.min(stats.dopaRatio * 5, 100)}%`; // Scale it visually? 
    // Let's make 20% width = 100% of bar for better resolution? 
    // No, simple linear is fine but max out at 20% for visual since it shouldn't go higher.
    // Actually user says 10% is goal. Let's map 0-20% range to 0-100% width for better sensitivity.
    const visualPercent = Math.min((stats.dopaRatio / 20) * 100, 100);
    els.dopamineGauge.style.width = `${visualPercent}%`;
    
    els.dopaminePercent.textContent = `${stats.dopaRatio.toFixed(1)}%`;
    
    // Status Badge
    if (stats.dopaRatio > 12) {
        els.dopamineStatus.textContent = "CRITICAL";
        els.dopamineStatus.className = "badge badge-stop";
    } else if (stats.dopaRatio > 10) {
        els.dopamineStatus.textContent = "WARNING";
        els.dopamineStatus.className = "badge badge-warn";
    } else {
        els.dopamineStatus.textContent = "STABLE";
        els.dopamineStatus.className = "badge badge-ok";
    }

    // 4. Details
    els.isaTotal.textContent = formatCurrency(stats.isa);
    els.isaRatio.textContent = stats.isaRatio.toFixed(1);
    
    els.overseasTotal.textContent = formatCurrency(stats.ovs);
    els.overseasRatio.textContent = stats.ovsRatio.toFixed(1);

    els.dopamineTotal.textContent = formatCurrency(stats.dopa);
    els.dopamineRatio.textContent = stats.dopaRatio.toFixed(1);

    // 5. Action Guide
    const actions = getActions(stats, prevStats, latest.netFlow);
    els.actionContent.innerHTML = `
        <ul>
            ${actions.map(a => `<li>${a.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}
        </ul>
    `;

    // 6. History List
    renderHistory();
};

const renderHistory = () => {
    els.historyList.innerHTML = financialData.slice(0, 5).map(entry => {
        const stats = calculateStats(entry);
        return `
            <li>
                <span class="history-date">${entry.date}</span>
                <span class="history-val">${formatCurrency(stats.total)}원</span>
            </li>
        `;
    }).join('');
};

// Event Listeners
els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newVal = {
        date: els.date.value,
        isa: {
            eval: Number(els.isaEval.value),
            cash: Number(els.isaCash.value)
        },
        overseas: {
            eval: Number(els.ovsEval.value),
            cash: Number(els.ovsCash.value)
        },
        dopamine: {
            eval: Number(els.dopaEval.value),
            cash: Number(els.dopaCash.value)
        },
        netFlow: Number(els.netFlow.value)
    };

    // Remove existing entry for same month if any
    financialData = financialData.filter(d => d.date !== newVal.date);
    financialData.unshift(newVal);
    saveData();
    
    els.modal.classList.add('hidden');
    els.form.reset();
});

els.openBtn.addEventListener('click', () => {
    // Set default date to today
    els.date.valueAsDate = new Date();
    els.modal.classList.remove('hidden');
});

els.closeBtn.addEventListener('click', () => {
    els.modal.classList.add('hidden');
});

// Close modal on outside click
els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) {
        els.modal.classList.add('hidden');
    }
});

// Backup & Restore
els.backupBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(financialData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth_core_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

els.restoreBtn.addEventListener('click', () => els.restoreInput.click());

els.restoreInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                financialData = data;
                saveData();
                alert('데이터가 성공적으로 복구되었습니다.');
            } else {
                throw new Error('Invalid format');
            }
        } catch (err) {
            alert('파일 형식이 올바르지 않습니다.');
        }
    };
    reader.readAsText(file);
});

// Init
loadData();
