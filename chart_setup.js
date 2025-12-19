// Chart.js Setup Module

let portfolioChart = null;

function formatCurrency(num) {
    const manWon = Math.round(num / 10000);
    return new Intl.NumberFormat('ko-KR').format(manWon) + '만';
}

window.initCharts = () => {
    const ctx = document.getElementById('portfolioChart')?.getContext('2d');
    if (!ctx) return;
    
    // Core colors from styles.css
    const colors = {
        isa: '#38bdf8', // Sky 400
        overseas: '#818cf8', // Indigo 400
        dopamine: '#fb7185', // Rose 400
        cash: '#94a3b8' // Slate 400
    };

    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f8fafc',
                        font: { family: 'Outfit' },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.chart._metasets[context.datasetIndex].total;
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return `${context.label}: ${formatCurrency(value)} (${percentage})`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
};

window.updatePortfolioChart = (nodes) => {
    if (!portfolioChart) {
        window.initCharts();
        if (!portfolioChart) return;
    }

    // Filter for Investment Assets and Buckets
    const assets = nodes.filter(n => n.type === 'asset' && n.value > 0);
    const buckets = nodes.filter(n => n.type === 'bucket' && n.value > 0);
    
    const labels = [];
    const data = [];
    const bgColors = [];

    // Helper palette generator
    const palette = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa'];

    assets.forEach((node, index) => {
        labels.push(node.name);
        data.push(node.value);
        bgColors.push(palette[index % palette.length]);
    });

    buckets.forEach((node, index) => {
        if (node.value > 0) {
            labels.push(`${node.name} (현금)`);
            data.push(node.value);
            bgColors.push('#64748b'); // Grey for cash
        }
    });

    portfolioChart.data.labels = labels;
    portfolioChart.data.datasets[0].data = data;
    portfolioChart.data.datasets[0].backgroundColor = bgColors;
    portfolioChart.update();
};

// Auto-init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initCharts);
} else {
    window.initCharts();
}
