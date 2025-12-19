/**
 * main.js
 * Entry point for Money Flow Application
 */

import { FlowModel } from './model/FlowModel.js';
import { FlowRenderer } from './view/FlowRenderer.js';
import { UIManager } from './view/UIManager.js';
import { StorageManager } from './services/StorageManager.js';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    
    // Components
    const model = new FlowModel();
    const storage = new StorageManager();
    const renderer = new FlowRenderer('flowCanvas');
    const ui = new UIManager(model, renderer, storage);

    // Initial Load
    const loaded = storage.load(model);
    
    if (!loaded) {
        // Seed Defaults
        console.log("No data found, seeding defaults.");
        const salary = model.addNode('income', '급여', 3500000);
        const main = model.addNode('bucket', '급여통장', 0);
        const isa = model.addNode('asset', 'ISA 계좌', 25000000);
        const living = model.addNode('bucket', '생활비', 1000000);
        const invest = model.addNode('asset', '해외주식', 20000000);
        
        // New Fixed Expenses
        const rent = model.addNode('expense', '주거', 500000);
        const telecom = model.addNode('expense', '통신비', 60000);
        const aiSubs = model.addNode('expense', 'AI구독료', 30000);
        
        model.addLink(salary.id, main.id, 3500000);
        model.addLink(main.id, isa.id, 1000000);
        model.addLink(main.id, living.id, 1000000);
        model.addLink(living.id, rent.id, 500000);
        model.addLink(living.id, telecom.id, 60000);
        model.addLink(living.id, aiSubs.id, 30000);
        
        // Initial Layout
        renderer.autoLayout(model);
        
        storage.save(model);
    } else {
        // Migration: If nodes don't have x/y, run autoLayout once
        if (model.nodes.some(n => !n.x)) {
            renderer.autoLayout(model);
        }
    }

    // Initial Render
    ui.renderAll();
    
    // Handle Window Resize
    window.addEventListener('resize', () => {
        renderer.resize();
        renderer.render(model);
    });
    
    // Set Date
    const today = new Date();
    const dateEl = document.getElementById('currentDate');
    if(dateEl) dateEl.textContent = `${today.getFullYear()}.${today.getMonth()+1}.${today.getDate()}`;
    
    console.log("Money Flow App V2 Initialized");
});
