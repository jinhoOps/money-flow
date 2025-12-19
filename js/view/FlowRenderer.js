/**
 * FlowRenderer.js
 * Handles Canvas rendering for the Flow Diagram.
 */

export class FlowRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.parentElement.clientWidth;
        this.height = 400; // Fixed height for now
        
        // Resize logic to be handled by caller or ResizeObserver
        this.resize();
    }

    resize() {
        this.width = this.canvas.parentElement.clientWidth;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    /**
     * Calculates positions only if needed or forced.
     * Writes to node.x and node.y
     */
    autoLayout(model) {
        const cols = {
             income: model.nodes.filter(n => n.type === 'income'),
             bucket: model.nodes.filter(n => n.type === 'bucket'),
             sink: model.nodes.filter(n => n.type === 'asset' || n.type === 'expense')
        };

        const colWidth = this.width / 3;
        
        const positionNodes = (nodes, colIndex) => {
             const x = colIndex * colWidth + (colWidth / 2); 
             const xAdjusted = colIndex === 0 ? 80 : (colIndex === 2 ? this.width - 80 : x);
             const spacing = this.height / (nodes.length + 1);
             
             nodes.forEach((n, i) => {
                 n.x = xAdjusted;
                 n.y = (i + 1) * spacing;
             });
        };

        positionNodes(cols.income, 0);
        positionNodes(cols.bucket, 1);
        positionNodes(cols.sink, 2);
    }

    render(model) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Get calculated stats to display real-time values
        const stats = model.calculateFlows();
        
        // Draw Links First
        model.links.forEach(l => {
            const s = model.nodes.find(n => n.id === l.source);
            const t = model.nodes.find(n => n.id === l.target);
            if (s && t) {
                this.drawLink(s, t, l.amount);
            }
        });

        // Draw Nodes using their stored x/y and calculated stats
        model.nodes.forEach(n => {
            const nodeStats = stats.nodeBalances[n.id] || { in: 0, out: 0, net: 0 };
            this.drawNode(n, nodeStats);
        });
    }

    drawNode(node, nodeStats) {
        const x = node.x || 0;
        const y = node.y || 0;
        const { name, type } = node;
        
        // Color Mapping
        const colors = {
            income: '#38bdf8',
            bucket: '#94a3b8',
            asset: '#34d399',
            expense: '#fb7185'
        };
        const color = colors[type] || 'white';

        // Draw Circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#1e293b'; 
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Label
        this.ctx.fillStyle = 'white';
        this.ctx.font = '600 13px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(name, x, y + 35);
        
        // Calculated Value Display
        // Income: Show source value
        // Expense: Show total coming in
        // Bucket/Asset: Show balance (Initial + Net)
        let displayValue = 0;
        if (type === 'income') displayValue = node.value;
        else if (type === 'expense') displayValue = nodeStats.in;
        else displayValue = node.value + nodeStats.net; // Current Balance + Monthly Change

        if (displayValue !== 0) {
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '12px Noto Sans KR';
            this.ctx.fillText(this.formatCurrency(displayValue), x, y + 50);
        }
    }

    drawLink(s, t, amount) {
        // Use stored positions
        const sx = s.x || 0; const sy = s.y || 0;
        const tx = t.x || 0; const ty = t.y || 0;

        this.ctx.beginPath();
        this.ctx.moveTo(sx + 20, sy);
        
        // Bezier
        const cp1x = sx + (tx - sx) / 2;
        const cp2x = cp1x;
        
        this.ctx.bezierCurveTo(cp1x, sy, cp2x, ty, tx - 20, ty);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        const w = Math.max(1, Math.min(8, amount / 500000));
        this.ctx.lineWidth = w;
        this.ctx.stroke();
    }
    
    // Hit Detection
    getNodeAt(x, y) {
        // radius 20 + padding?
        return this.ctx.canvas.parentElement.parentElement ? // Ensuring context access logic if needed, but model is passed to render... 
               // Wait, I don't have model here. Need to pass it or store it.
               // Let's rely on caller passing model to getNodeAt? Or store reference?
               // Use a simpler approach: UIManager calls this and passes nodes? 
               // Or FlowRenderer should store the last rendered nodes?
               null : null;
    }

    // Better: Helper method that takes nodes and coords
    findNodeAt(nodes, x, y) {
        return nodes.find(n => {
            const dx = x - (n.x || 0);
            const dy = y - (n.y || 0);
            return (dx * dx + dy * dy) <= (25 * 25); // 20 radius -> 25 hit area
        });
    }
    
    formatCurrency(num) {
         const manWon = Math.round(num / 10000);
         return new Intl.NumberFormat('ko-KR').format(manWon) + '만';
    }
}
