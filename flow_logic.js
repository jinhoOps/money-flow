/**
 * Flow Logic Module
 * Handles the Graph Data Structure (Nodes & Links)
 */

class MoneyGraph {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.nextId = 1;
    }

    // --- Node Operations ---
    addNode(type, name, value = 0, x = 0, y = 0) {
        const node = {
            id: this.nextId++,
            type, // 'income', 'bucket' (account), 'expense', 'asset' (invest)
            name,
            value, // Current collected amount or monthly input
            x,
            y,
            targetPercent: 0 // Only for assets
        };
        this.nodes.push(node);
        return node;
    }

    updateNode(id, updates) {
        const node = this.nodes.find(n => n.id === id);
        if (node) {
            Object.assign(node, updates);
        }
    }

    deleteNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.links = this.links.filter(l => l.source !== id && l.target !== id);
    }

    // --- Link Operations ---
    addLink(sourceId, targetId, amount = 0) {
        // Prevent duplicates
        if (this.links.some(l => l.source === sourceId && l.target === targetId)) {
            return null;
        }
        
        const link = {
            id: `link_${sourceId}_${targetId}`,
            source: sourceId,
            target: targetId,
            amount,
            percent: 0 // Optional: if we want % based flows later
        };
        this.links.push(link);
        return link;
    }

    updateLink(sourceId, targetId, updates) {
        const link = this.links.find(l => l.source === sourceId && l.target === targetId);
        if (link) {
            Object.assign(link, updates);
        }
    }

    deleteLink(sourceId, targetId) {
        this.links = this.links.filter(l => !(l.source === sourceId && l.target === targetId));
    }

    // --- Calculation ---
    calculateFlows() {
        // Reset dynamic values if needed, for now we trust the stored 'value' 
        // or we might want to recalculate 'bucket' values based on Income inflows?
        
        // Strategy: 
        // 1. Income nodes drive the flow.
        // 2. Buckets fill up from Incomes.
        // 3. Outflows (Expense/Asset) drain from Buckets.
        
        // For V1 simple version: flows are manual "Planned" amounts.
        // We calculate "Total In" and "Total Out" for each node to show net changes.
        
        const stats = {
            totalIncome: 0,
            totalInvested: 0,
            totalExpenses: 0,
            nodeBalances: {} 
        };

        // Initialize balances
        this.nodes.forEach(n => {
            stats.nodeBalances[n.id] = { in: 0, out: 0, net: 0 };
            if (n.type === 'income') stats.totalIncome += n.value;
        });

        // Sum flows
        this.links.forEach(l => {
            if (stats.nodeBalances[l.target]) stats.nodeBalances[l.target].in += l.amount;
            if (stats.nodeBalances[l.source]) stats.nodeBalances[l.source].out += l.amount;
            
            const targetNode = this.nodes.find(n => n.id === l.target);
            if (targetNode) {
                if (targetNode.type === 'asset') stats.totalInvested += l.amount;
                if (targetNode.type === 'expense') stats.totalExpenses += l.amount;
            }
        });

        // Calculate Net
        this.nodes.forEach(n => {
            const b = stats.nodeBalances[n.id];
            b.net = b.in - b.out;
            // Income nodes are source, so their 'Net' isn't really relevant in this way, 
            // but for Buckets: Net > 0 means growing, Net < 0 means shrinking.
        });

        return stats;
    }

    // --- Persistence ---
    serialize() {
        return JSON.stringify({
            nodes: this.nodes,
            links: this.links,
            nextId: this.nextId
        });
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.nodes = data.nodes || [];
        this.links = data.links || [];
        this.nextId = data.nextId || 1;
    }
}

// Export singleton or class
const moneyGraph = new MoneyGraph();
