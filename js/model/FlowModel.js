/**
 * FlowModel.js
 * Core data structure and logic for the Money Flow application.
 * Manages Nodes, Links, and Flow Calculations.
 */

export class FlowModel {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.nextId = 1;
        this.owners = ['나']; // Default profile
        this.currentProfile = '나'; // Default: personal profile
        
        // Simulation Configuration
        this.simulation = {
            enabled: false,
            months: 0, // 0 = Current, 12 = 1 Year, 60 = 5 Years
            inflationRate: 0.025, // 2.5% default inflation
            isRealValue: false // Toggle for Real vs Nominal
        };
    }

    // --- Owner Operations ---
    addOwner(name) {
        if (!name) return null;
        if (this.owners.includes(name)) return null;
        this.owners.push(name);
        return name;
    }

    deleteOwner(name) {
        this.owners = this.owners.filter(o => o !== name);
        // also remove owner from nodes
        this.nodes.forEach(n => { if (n.owner === name) n.owner = '' });
    }

    getOwners() {
        return this.owners.slice();
    }

    // --- Node Operations ---
    addNode(type, name, value = 0, x = 0, y = 0, owner = '나') {
        const node = {
            id: this.nextId++,
            type, // 'income', 'bucket', 'expense', 'asset'
            name,
            value, // Monthly Amount (Income/Expense) or Current Balance (Asset/Bucket)
            x,
            y,
            owner,
            interestRate: 0.025, // Default 2.5% for assets
            isCompounding: type === 'asset' // Only assets match compound logic by default
        };
        this.nodes.push(node);
        return node;
    }

    updateNode(id, updates) {
        const node = this.nodes.find(n => n.id === id);
        if (node) {
            Object.assign(node, updates);
        }
        return node;
    }

    deleteNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.links = this.links.filter(l => l.source !== id && l.target !== id);
    }

    // --- Link Operations ---
    addLink(sourceId, targetId, amount = 0) {
        // Prevent duplicates and self-loops
        if (sourceId === targetId) return null;
        if (this.links.some(l => l.source === sourceId && l.target === targetId)) {
            return null;
        }
        
        const link = {
            id: `link_${sourceId}_${targetId}`,
            source: sourceId,
            target: targetId,
            amount
        };
        this.links.push(link);
        return link;
    }

    updateLink(sourceId, targetId, updates) {
        const link = this.links.find(l => l.source === sourceId && l.target === targetId);
        if (link) {
            Object.assign(link, updates);
        }
        return link;
    }

    deleteLink(sourceId, targetId) {
        this.links = this.links.filter(l => !(l.source === sourceId && l.target === targetId));
    }

    // --- Helper: Get nodes for current profile ---
    getFilteredNodes() {
        if (!this.currentProfile) {
            return this.nodes;
        }
        return this.nodes.filter(n => n.owner === this.currentProfile || !n.owner);
    }

    // --- core Logic ---
    
    /**
     * Calculates the net flow for all nodes.
     * @returns {Object} statistics
     */
    calculateFlows() {
        const stats = {
            totalIncome: 0,
            totalInvested: 0,
            totalExpenses: 0,
            nodeBalances: {}, // Net change per node (in - out)
            futureValues: {} // For simulation
        };

        // Get filtered nodes based on current profile
        const filteredNodes = this.getFilteredNodes();
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

        // Initialize
        this.nodes.forEach(n => {
            stats.nodeBalances[n.id] = { in: 0, out: 0 };
            stats.futureValues[n.id] = n.value; // Start with current
            if (n.type === 'income' && filteredNodeIds.has(n.id)) {
                stats.totalIncome += n.value;
            }
        });

        // Sum Flows (only consider links involving filtered nodes)
        this.links.forEach(l => {
            const sourceInProfile = filteredNodeIds.has(l.source);
            const targetInProfile = filteredNodeIds.has(l.target);
            
            // Only count links where at least one end is in the filtered profile
            if (sourceInProfile || targetInProfile) {
                if (stats.nodeBalances[l.target]) stats.nodeBalances[l.target].in += l.amount;
                if (stats.nodeBalances[l.source]) stats.nodeBalances[l.source].out += l.amount;

                const targetNode = this.nodes.find(n => n.id === l.target);
                if (targetNode && filteredNodeIds.has(targetNode.id)) {
                    if (targetNode.type === 'asset') stats.totalInvested += l.amount;
                    if (targetNode.type === 'expense') stats.totalExpenses += l.amount;
                }
            }
        });

        // Calculate Net Monthly Surplus (for Bucket/Asset growth)
        this.nodes.forEach(n => {
            const b = stats.nodeBalances[n.id];
            b.net = b.in - b.out;
        });

        // --- SIMULATION LOGIC ---
        // If simulation is enabled (months > 0), we project values forward
        if (this.simulation.months > 0) {
            this.calculateProjection(stats);
        }

        return stats;
    }

    calculateProjection(stats) {
        const months = this.simulation.months;
        const inflation = this.simulation.inflationRate / 12; // Monthly inflation
        
        this.nodes.forEach(n => {
            if (n.type === 'asset' || n.type === 'bucket') {
                let futureValue = n.value;
                const monthlyContribution = stats.nodeBalances[n.id].net;
                
                // Monthly Compounding Formula
                const r = (n.interestRate || 0.0) / 12; // Monthly intent
                
                // FV = P * (1+r)^n + PMT * [ ((1+r)^n - 1) / r ]
                // If r is 0, simple implementation: P + PMT * n
                
                if (r > 0) {
                    const compoundFactor = Math.pow(1 + r, months);
                    const initialCompounded = futureValue * compoundFactor;
                    const contributionsCompounded = monthlyContribution * ((compoundFactor - 1) / r);
                    futureValue = initialCompounded + contributionsCompounded;
                } else {
                    futureValue = futureValue + (monthlyContribution * months);
                }

                // Apply Real Value adjustment if requested
                if (this.simulation.isRealValue) {
                    // Discount back by inflation: Real = Nominal / (1 + i)^n
                    futureValue = futureValue / Math.pow(1 + inflation, months);
                }

                stats.futureValues[n.id] = futureValue;
            }
        });
    }

    // --- Persistence ---
    serialize() {
        return JSON.stringify({
            nodes: this.nodes,
            links: this.links,
            nextId: this.nextId,
            simulation: this.simulation,
            owners: this.owners,
            currentProfile: this.currentProfile
        });
    }

    deserialize(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.nodes = data.nodes || [];
            this.links = data.links || [];
            this.nextId = data.nextId || 1;
            this.simulation = data.simulation || this.simulation;
            this.owners = (data.owners && data.owners.length > 0) ? data.owners : ['나'];
            this.currentProfile = data.currentProfile || this.owners[0];
            
            // Migration: Ensure '나' exists as default if nothing else is active
            if (!this.owners.includes(this.currentProfile)) {
                this.currentProfile = this.owners[0];
            }
            
            // Migration: Ensure new properties exist
            this.nodes.forEach(n => {
                if (n.owner === undefined) n.owner = '나'; // Default to personal profile
                if (n.type === 'asset' && n.interestRate === undefined) n.interestRate = 0.025;
            });
        } catch (e) {
            console.error("Failed to load data", e);
        }
    }
}
