/**
 * UIManager.js
 * Handles DOM interactions, Modals, and Dashboard updates.
 */

export class UIManager {
    constructor(model, renderer, storage) {
        this.model = model;
        this.renderer = renderer;
        this.storage = storage;

        // Cache DOM elements
        this.els = {
            tabs: document.querySelectorAll('.tab-btn'),
            contents: document.querySelectorAll('.tab-content'),
            
            // Dashboard
            totalNetWorth: document.getElementById('totalNetWorth'),
            monthlyIncome: document.getElementById('totalMonthlyIncome'),
            monthlyInvest: document.getElementById('totalMonthlyInvest'),
            
            // Editor
            nodeList: document.getElementById('editorNodeList'),
            linkList: document.getElementById('editorLinkList'),
            
            // Modals
            nodeModal: document.getElementById('nodeModal'),
            linkModal: document.getElementById('linkModal'),
            
            // Forms
            nodeForm: document.getElementById('nodeForm'),
            linkForm: document.getElementById('linkForm'),
            
            // Buttons
            addNodeBtn: document.getElementById('addNodeBtn'),
            addLinkBtn: document.getElementById('addLinkBtn'),
            refreshFlowBtn: document.getElementById('refreshFlowBtn'),
            backupBtn: document.getElementById('backupBtn'),
            restoreBtn: document.getElementById('restoreBtn'),
            restoreInput: document.getElementById('restoreInput'),

            // Simulation
            simPeriod: document.getElementById('simPeriod'),
            simInflation: document.getElementById('simInflation'),
            simRealToggle: document.getElementById('simRealToggle'),
            
            
            // Owner Management UI
            ownerInput: document.getElementById('ownerInput'),
            addOwnerBtn: document.getElementById('addOwnerBtn'),
            
            // Modal extra fields
            nodeOwner: document.getElementById('nodeOwner'),
            nodeType: document.getElementById('nodeType'),
            interestRateRow: document.getElementById('interestRateRow'),
            nodeInterest: document.getElementById('nodeInterest'),
            nodeValue: document.getElementById('nodeValue'),
            nodeTargetWeight: document.getElementById('nodeTargetWeight'),
            targetWeightRow: document.getElementById('targetWeightRow'),
            resetDataBtn: document.getElementById('resetDataBtn'),

            // Strategy View
            strategyContent: document.getElementById('strategyContent'),
            strategyEditInput: document.getElementById('strategyEditInput'),
            saveStrategyBtn: document.getElementById('saveStrategyBtn'),
            strategyUpdatedAt: document.getElementById('strategyUpdatedAt'),
            
            // Sub-items
            subItemsRow: document.getElementById('subItemsRow'),
            subItemsContainer: document.getElementById('subItemsContainer'),
            addSubItemBtn: document.getElementById('addSubItemBtn')
        };

        this.selectedSourceId = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Simulation Listeners
        const updateSim = () => {
             this.model.simulation.months = Number(this.els.simPeriod.value);
             this.model.simulation.inflationRate = Number(this.els.simInflation.value) / 100;
             // Toggle handled separately
             
             this.updateDashboard();
             // Optimization: Do we update Flow view? Flow view shows current setup.
             // Maybe we can show projected values on nodes too? For now, Dashboard only.
        };
        
        this.els.simPeriod.addEventListener('change', updateSim);
        this.els.simInflation.addEventListener('change', updateSim);
        
        this.els.simRealToggle.addEventListener('click', () => {
            const isActive = this.els.simRealToggle.dataset.active === 'true';
            const newState = !isActive;
            this.els.simRealToggle.dataset.active = newState;
            
            if (newState) {
                this.els.simRealToggle.textContent = '실질가치 (Real)';
                this.els.simRealToggle.style.background = 'var(--accent-success)';
                this.els.simRealToggle.style.color = '#0f172a';
            } else {
                this.els.simRealToggle.textContent = '명목가치 (Nominal)';
                this.els.simRealToggle.style.background = 'rgba(255,255,255,0.1)';
                this.els.simRealToggle.style.color = 'white';
            }
            
            this.model.simulation.isRealValue = newState;
            updateSim();
        });

        // Tabs
        this.els.tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                
                // Toggle Buttons
                this.els.tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Toggle Content
                this.els.contents.forEach(c => {
                    c.id === target + 'View' ? c.classList.add('active') : c.classList.remove('active');
                    c.id === target + 'View' ? c.classList.remove('hidden') : c.classList.add('hidden');
                });

                if (target === 'flow') this.renderer.render(this.model);
                if (target === 'dashboard') this.updateDashboard();
                if (target === 'editor') this.renderEditor();
                if (target === 'profile') this.renderProfileCards();
                if (target === 'strategy') this.renderStrategy();
            });
        });

        // Strategy Save
        if (this.els.saveStrategyBtn) {
            this.els.saveStrategyBtn.addEventListener('click', () => {
                this.model.strategy.summary = this.els.strategyEditInput.value;
                this.model.strategy.updatedAt = new Date().toISOString();
                this.storage.save(this.model);
                this.renderStrategy();
                alert('전략이 저장되었습니다.');
            });
        }

        // Buttons (Refresh, Backup...)
        this.els.refreshFlowBtn.addEventListener('click', () => {
             this.renderer.autoLayout(this.model);
             this.saveAndRender();
        });
        
        // ... (Backup logic skipped for brevity match, assume existing) ...
         this.els.backupBtn.addEventListener('click', () => this.storage.exportToFile(this.model));
        this.els.restoreBtn.addEventListener('click', () => this.els.restoreInput.click());
         this.els.restoreInput.addEventListener('change', (e) => {
             if (e.target.files.length > 0) {
                 this.storage.importFromFile(e.target.files[0], this.model, () => {
                     this.renderAll();
                     alert('Restored successfully');
                 });
             }
        });

        // Node Modal Type Change -> Show/Hide Interest & Handle Value Label
        this.els.nodeType.addEventListener('change', () => {
            const type = this.els.nodeType.value;
            const valueRow = this.els.nodeValue.parentElement;
            const valueLabel = valueRow.querySelector('label');

            if (type === 'asset') {
                this.els.interestRateRow.classList.remove('hidden');
                this.els.targetWeightRow.classList.remove('hidden');
                this.els.subItemsRow.classList.remove('hidden');
                valueRow.classList.remove('hidden');
                valueLabel.textContent = '현재 잔고 (만원)';
            } else if (type === 'bucket') {
                this.els.interestRateRow.classList.add('hidden');
                this.els.targetWeightRow.classList.add('hidden');
                this.els.subItemsRow.classList.add('hidden');
                valueRow.classList.remove('hidden');
                valueLabel.textContent = '현재 잔고 (만원)';
            } else if (type === 'income') {
                this.els.interestRateRow.classList.add('hidden');
                this.els.targetWeightRow.classList.add('hidden');
                this.els.subItemsRow.classList.add('hidden');
                valueRow.classList.remove('hidden');
                valueLabel.textContent = '월 소득액 (만원)';
            } else if (type === 'expense') {
                this.els.interestRateRow.classList.add('hidden');
                this.els.targetWeightRow.classList.add('hidden');
                this.els.subItemsRow.classList.add('hidden');
                valueRow.classList.add('hidden'); // Expenses don't have static value, they are sum(in)
            }
        });
        
        // Node Modal
        this.els.addNodeBtn.addEventListener('click', () => this.showNodeModal());
        document.getElementById('closeNodeModal').addEventListener('click', () => this.els.nodeModal.classList.add('hidden'));
        
        this.els.nodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNodeSubmit();
        });

        // Link Modal (same as before)
        this.els.addLinkBtn.addEventListener('click', () => this.showLinkModal());
        document.getElementById('closeLinkModal').addEventListener('click', () => this.els.linkModal.classList.add('hidden'));
        
        this.els.linkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLinkSubmit();
        });
        
        // Canvas Interactions (Drag, Select, Connect)
        const canvas = this.renderer.canvas;
        let isDragging = false;
        let draggedNode = null;
        let startPos = { x: 0, y: 0 };
        let hasMoved = false;

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            startPos = { x, y };
            hasMoved = false;

            const node = this.renderer.findNodeAt(this.model.nodes, x, y);
            if (node) {
                isDragging = true;
                draggedNode = node;
                canvas.style.cursor = 'grabbing';
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (isDragging && draggedNode) {
                if (Math.abs(x - startPos.x) > 3 || Math.abs(y - startPos.y) > 3) {
                    hasMoved = true;
                }
                draggedNode.x = x;
                draggedNode.y = y;
                this.renderer.render(this.model);
            } else {
                const node = this.renderer.findNodeAt(this.model.nodes, x, y);
                const link = this.renderer.findLinkAt(this.model.links, this.model.nodes, x, y);
                canvas.style.cursor = node || link ? 'pointer' : 'default';
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                draggedNode = null;
                canvas.style.cursor = 'default';
                if (hasMoved) {
                    this.storage.save(this.model);
                }
            }

            // Click Logic (If not a significant drag)
            if (!hasMoved) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const node = this.renderer.findNodeAt(this.model.nodes, x, y);
                const link = this.renderer.findLinkAt(this.model.links, this.model.nodes, x, y);

                if (node) {
                    if (this.selectedSourceId && this.selectedSourceId !== node.id) {
                        // CONNECT!
                        this.showLinkModal(this.selectedSourceId, node.id);
                        this.selectedSourceId = null;
                    } else {
                        // SELECT/DESELECT
                        this.selectedSourceId = (this.selectedSourceId === node.id) ? null : node.id;
                    }
                } else if (link) {
                    // EDIT LINK
                    this.showLinkModal(link.source, link.target);
                    this.selectedSourceId = null;
                } else {
                    // CLICKED EMPTY SPACE
                    this.selectedSourceId = null;
                }
                
                this.renderer.setSelectedNode(this.selectedSourceId);
                this.renderer.render(this.model);
            }
        });

        // Global functions
        window.editNode = (id) => this.showNodeModal(id);

        // ----- Owner Management -----
        if (this.els.addOwnerBtn && this.els.ownerInput) {
            this.els.addOwnerBtn.addEventListener('click', () => {
                const name = this.els.ownerInput.value.trim();
                if (!name) return;
                const added = this.model.addOwner(name);
                if (added) {
                    this.els.ownerInput.value = '';
                    this.renderProfileCards();
                    this.storage.save(this.model);
                } else {
                    alert('프로필이 이미 존재하거나 유효하지 않습니다');
                }
            });

            // Initialize profile cards when needed
            this.renderProfileCards();
        }

        if (this.els.resetDataBtn) {
            this.els.resetDataBtn.addEventListener('click', () => {
                if (confirm('모든 데이터를 삭제하고 초기 상태로 되돌리시겠습니까?\n이 작업은 취소할 수 없습니다.')) {
                    localStorage.clear();
                    location.reload();
                }
            });
        }

        // Sub-items Event
        if (this.els.addSubItemBtn) {
            this.els.addSubItemBtn.addEventListener('click', () => {
                this.addSubItemRow();
            });
        }
    }

    updateOwnerList() {
        this.renderProfileCards();
    }

    renderProfileCards() {
        const profileCards = document.getElementById('profileCards');
        if (!profileCards) return;

        const owners = this.model.getOwners();
        const currentProfile = this.model.currentProfile || (owners.length > 0 ? owners[0] : '나');

        profileCards.innerHTML = owners.map(profile => {
            const isActive = profile === currentProfile;
            
            // Count nodes for this profile
            const nodesForProfile = this.model.nodes.filter(n => n.owner === profile);
            const nodeCount = nodesForProfile.length;
            const totalProfileWealth = nodesForProfile
                .filter(n => n.type === 'asset' || n.type === 'bucket')
                .reduce((sum, n) => sum + n.value, 0);

            return `
                <div class="profile-card ${isActive ? 'active' : ''}" 
                     data-profile="${profile}" 
                     onclick="window.switchProfile('${profile}')">
                    <div class="profile-card-icon">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div class="profile-card-name">${profile}</div>
                    <div class="profile-card-stats">${nodeCount} 항목</div>
                    <div class="profile-card-stats" style="font-size: 0.75rem; opacity: 0.8;">
                        자산: ${this.formatCurrency(totalProfileWealth)}
                    </div>
                    ${owners.length > 1 ? `
                        <div class="profile-card-delete" 
                             onclick="event.stopPropagation(); window.deleteProfile('${profile}')">
                            <i class="fa-solid fa-trash"></i>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Update header indicator
        const profileNameEl = document.getElementById('currentProfileName');
        if (profileNameEl) {
            profileNameEl.textContent = currentProfile;
        }

        // Setup global functions
        window.switchProfile = (profileName) => {
            if (!this.model.owners.includes(profileName)) return;
            this.model.currentProfile = profileName;
            this.storage.save(this.model);
            this.renderProfileCards();
            this.renderAll();
        };

        window.deleteProfile = (profileName) => {
            if (this.model.owners.length <= 1) {
                alert('최소 하나의 프로필은 존재해야 합니다.');
                return;
            }
            if (confirm(`"${profileName}" 프로필을 삭제하시겠습니까?\n(해당 프로필로 지정된 노드들의 소유자 정보가 삭제됩니다)`)) {
                this.model.deleteOwner(profileName);
                if (this.model.currentProfile === profileName) {
                    this.model.currentProfile = this.model.owners[0];
                }
                this.storage.save(this.model);
                this.renderProfileCards();
                this.renderAll();
            }
        };
    }

    // ... (rest of class) ...

    updateDashboard() {
        const stats = this.model.calculateFlows();
        const filteredNodes = this.model.getFilteredNodes();
        
        let totalAssets = 0;
        
        // Check if simulation is active (months > 0)
        const useSim = this.model.simulation.months > 0;
        
        filteredNodes.forEach(n => {
            if (n.type === 'asset' || n.type === 'bucket') {
                if (useSim) {
                    totalAssets += (stats.futureValues[n.id] || 0);
                } else {
                    totalAssets += n.value;
                }
            }
        });

        // Update Labels based on Sim Mode
        const labelPrefix = useSim ? `(Future ${this.model.simulation.months / 12}y)` : '';
        
        const titleEl = this.els.totalNetWorth.parentElement.querySelector('h3');
        if (titleEl) titleEl.textContent = `총 자산 (Net Worth) ${labelPrefix}`;
        
        this.els.totalNetWorth.textContent = this.formatCurrency(totalAssets);
        this.els.monthlyIncome.textContent = this.formatCurrency(stats.totalIncome);
        this.els.monthlyInvest.textContent = this.formatCurrency(stats.totalInvested);
        
        // Update Chart with Simulated values
        if (window.updatePortfolioChart) {
            // Create a temporary node list with simulated values for the chart
             const simNodes = filteredNodes.map(n => ({
                 ...n,
                 value: useSim ? (stats.futureValues[n.id] || 0) : n.value
             }));
            window.updatePortfolioChart(simNodes); 
        }
    }

    showNodeModal(id = null) {
        document.getElementById('nodeId').value = '';
        this.els.interestRateRow.classList.add('hidden'); // Default hide
        this.els.targetWeightRow.classList.add('hidden'); // Default hide
        this.els.subItemsRow.classList.add('hidden'); // Default hide
        this.els.subItemsContainer.innerHTML = ''; // Clear sub-items
        
        // Update owner select options
        if (this.els.nodeOwner) {
            this.els.nodeOwner.innerHTML = this.model.owners.map(o => `<option value="${o}">${o}</option>`).join('');
        }

        if (id) {
            const n = this.model.nodes.find(n => n.id === id);
            if (n) {
                document.getElementById('nodeId').value = n.id;
                document.getElementById('nodeName').value = n.name;
                document.getElementById('nodeType').value = n.type;
                document.getElementById('nodeValue').value = n.value / 10000; // UI scale
                this.els.nodeOwner.value = n.owner || this.model.currentProfile || '나';
                
                if (n.type === 'asset') {
                    this.els.interestRateRow.classList.remove('hidden');
                    document.getElementById('nodeInterest').value = (n.interestRate * 100).toFixed(1);
                    document.getElementById('nodeTargetWeight').value = n.targetWeight || 0;
                    
                    // Render sub-items
                    this.els.subItemsRow.classList.remove('hidden');
                    if (n.subItems && n.subItems.length > 0) {
                        n.subItems.forEach(item => this.addSubItemRow(item.name, item.ratio));
                    }
                }
            }
        } else {
            // Default owner for new nodes is current profile
            this.els.nodeOwner.value = this.model.currentProfile || '나';
        }
        
        // Trigger type change to update value labels
        this.els.nodeType.dispatchEvent(new Event('change'));
        
        this.els.nodeModal.classList.remove('hidden');
    }

    handleNodeSubmit() {
        const id = document.getElementById('nodeId').value;
        const type = document.getElementById('nodeType').value;
        const name = document.getElementById('nodeName').value;
        let value = Number(document.getElementById('nodeValue').value) * 10000; // Model scale
        const owner = this.els.nodeOwner.value.trim() || '';
        let interestRate = 0;
        
        if (type === 'asset') {
            const pct = Number(document.getElementById('nodeInterest').value);
            interestRate = pct / 100;
        }

        const targetWeight = Number(document.getElementById('nodeTargetWeight').value) || 0;
        
        // Collect sub-items
        const subItems = [];
        const rows = this.els.subItemsContainer.querySelectorAll('.sub-item-row');
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const subName = inputs[0].value.trim();
            const subRatio = Number(inputs[1].value) || 0;
            if (subName) {
                subItems.push({ name: subName, ratio: subRatio });
            }
        });

        // Sort sub-items by ratio descending before saving
        subItems.sort((a, b) => b.ratio - a.ratio);

        if (id) {
            this.model.updateNode(Number(id), { type, name, value, interestRate, owner, targetWeight, subItems });
        } else {
            const n = this.model.addNode(type, name, value, 0, 0, owner, targetWeight);
            this.model.updateNode(n.id, { interestRate, subItems }); // Set extra info
        }
        this.saveAndRender();
        this.els.nodeModal.classList.add('hidden');
    }

    showLinkModal(s = null, t = null) {
        this.els.linkForm.reset();
        const opts = this.model.nodes.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
        document.getElementById('linkSource').innerHTML = opts;
        document.getElementById('linkTarget').innerHTML = opts;

        if (s && t) {
            const l = this.model.links.find(lnk => lnk.source === s && lnk.target === t);
            if (l) {
                document.getElementById('linkSource').value = s;
                document.getElementById('linkTarget').value = t;
                document.getElementById('linkAmount').value = l.amount;
                // Store editing state if needed, or simply delete old & add new logic as before
                this.els.linkForm.dataset.oldS = s;
                this.els.linkForm.dataset.oldT = t;
                this.els.linkForm.dataset.mode = 'edit';
            }
        } else {
            this.els.linkForm.dataset.mode = 'add';
        }
        this.els.linkModal.classList.remove('hidden');
    }

    handleLinkSubmit() {
        const s = Number(document.getElementById('linkSource').value);
        const t = Number(document.getElementById('linkTarget').value);
        const amt = Number(document.getElementById('linkAmount').value);
        
        if (s === t) { alert('Self-loop not allowed'); return; }

        if (this.els.linkForm.dataset.mode === 'edit') {
            const oldS = Number(this.els.linkForm.dataset.oldS);
            const oldT = Number(this.els.linkForm.dataset.oldT);
            
            if (oldS !== s || oldT !== t) {
                this.model.deleteLink(oldS, oldT);
                this.model.addLink(s, t, amt);
            } else {
                this.model.updateLink(s, t, { amount: amt });
            }
        } else {
            this.model.addLink(s, t, amt);
        }
        
        this.saveAndRender();
        this.els.linkModal.classList.add('hidden');
    }

    formatCurrency(num) {
         const manWon = Math.round(num / 10000);
         return new Intl.NumberFormat('ko-KR').format(manWon) + '만';
    }

    saveAndRender() {
        this.storage.save(this.model);
        this.renderAll();
    }

    renderAll() {
        this.renderer.render(this.model);
        this.updateDashboard();
        this.renderEditor();
        this.renderProfileCards();
    }

    renderEditor() {
        const filteredNodes = this.model.getFilteredNodes();
        
        // Render filtered node list
        this.els.nodeList.innerHTML = filteredNodes.map(n => `
            <li class="editor-item">
                <div class="item-info">
                    <span class="item-name" style="color: var(--accent-primary)">
                        ${n.name}
                        ${n.type === 'asset' && n.targetWeight > 0 ? `<span style="font-size: 0.8rem; color: var(--accent-secondary); margin-left: 8px;">(목표: ${n.targetWeight}%)</span>` : ''}
                    </span>
                    <span class="item-type">${n.type}</span>
                    ${n.subItems && n.subItems.length > 0 ? `
                        <div class="sub-items-list" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px; padding-left: 10px; border-left: 1px solid var(--glass-border);">
                            ${n.subItems.map(si => {
                                const calculatedVal = n.value * (si.ratio / 100);
                                return `${si.name} (${this.formatCurrency(calculatedVal)}) ${si.ratio}%`;
                            }).join(' / ')}
                        </div>
                    ` : ''}
                    <span class="item-owner" style="font-size: 0.7rem; color: var(--text-secondary); display: block; margin-top: 2px;">Owner: ${n.owner || '나'}</span>
                </div>
                <div class="item-actions">
                    <button onclick="window.editNode(${n.id})" class="icon-btn-small" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="window.deleteNode(${n.id})" class="icon-btn-small" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </li>
        `).join('');

        // Render links associated with current profile nodes
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = this.model.links.filter(l => 
            filteredNodeIds.has(l.source) || filteredNodeIds.has(l.target)
        );

        this.els.linkList.innerHTML = filteredLinks.map(l => {
            const src = this.model.nodes.find(n => n.id === l.source);
            const tgt = this.model.nodes.find(n => n.id === l.target);
            return `
                <li class="editor-item">
                    <div class="item-info">
                        <span class="item-name">${src?.name || '?'} → ${tgt?.name || '?'}</span>
                        <span class="item-type" style="color: var(--accent-success)">${this.formatCurrency(l.amount)}</span>
                    </div>
                    <div class="item-actions">
                        <button onclick="window.editLink(${l.source}, ${l.target})" class="icon-btn-small" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="window.deleteLink(${l.source}, ${l.target})" class="icon-btn-small" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </li>
            `;
        }).join('');

        // Setup global functions for inline handlers
        window.deleteNode = (id) => {
            if (confirm('Delete this node?')) {
                this.model.deleteNode(id);
                this.saveAndRender();
            }
        };
        window.editLink = (s, t) => this.showLinkModal(s, t);
        window.deleteLink = (s, t) => {
            if (confirm('Delete this link?')) {
                this.model.deleteLink(s, t);
                this.saveAndRender();
            }
        };
    }

    renderStrategy() {
        if (!this.els.strategyContent) return;
        
        const strategy = this.model.strategy;
        this.els.strategyContent.textContent = strategy.summary || '설정된 전략이 없습니다.';
        this.els.strategyEditInput.value = strategy.summary || '';
        
        if (strategy.updatedAt) {
            const date = new Date(strategy.updatedAt);
            this.els.strategyUpdatedAt.textContent = `최종 수정: ${date.toLocaleString('ko-KR')}`;
        } else {
            this.els.strategyUpdatedAt.textContent = '';
        }
    }

    addSubItemRow(name = '', ratio = '') {
        const div = document.createElement('div');
        div.className = 'sub-item-row';
        div.style = 'display: flex; gap: 8px; align-items: center; width: 100%;';
        div.innerHTML = `
            <input type="text" placeholder="종목명" value="${name}" class="glass-input" style="flex: 2; padding: 6px; border-radius: 6px; font-size: 0.85rem;">
            <input type="number" placeholder="비중(%)" value="${ratio}" class="glass-input" style="flex: 1; padding: 6px; border-radius: 6px; font-size: 0.85rem;">
            <button type="button" class="icon-btn-small" onclick="this.parentElement.remove()" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: none; width: 28px; height: 28px;">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        this.els.subItemsContainer.appendChild(div);
    }
}
