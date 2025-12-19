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
        // Seed Defaults based on User Strategy
        console.log("No data found, seeding user strategy defaults.");
        
        // 1. Set Global Strategy Summary
        model.strategy.summary = `* S&P는 해외직투에서만 레버리지(SSO) 혼합으로 운용(ISA는 1배 고정)

[운영 컨셉]
ISA에서 목표비중을 고정 세팅해두고, 해외직투는 같은 카테고리 비중(S&P/나스닥/배당)을 그대로 따라가되, S&P만 SSO/VOO로 70/30 레버리지 혼합으로 운용합니다.

[전체 포트폴리오 목표]
* S&P 60% / 나스닥 5% / 배당 35% (SCHD + 미국배당다우존스 계열)

[계좌별 목표비중]
A. ISA: TIGER S&P 60% / TIGER 나스닥 5% / TIGER 미국배당다우존스 35%
B. 해외직투: SSO 42% / VOO 18% / QQQM 5% / SCHD 35%

[운용 원칙]
1. 신규 적립금 배분부터 즉시 변경 (QQQM 추가 매수 중단, SCHD/S&P 버킷 집중 적립)
2. 리밸런싱은 분기 1회 (과매매 방지)
3. 해외직투 비중 미달 시 매도보다 신규 자금 투입으로 비중 상향 유도

[핵심 요약]
- ISA는 1배 ETF로 S&P 60 / 나스닥 5 / 미국배당 35 고정
- 해외직투는 ISA 미러링 + S&P만 레버리지(SSO 70:VOO 30) 혼합
- 나스닥은 AI 과열 구간에서 5% 이하 유지, 폭락 시에만 확대 검토`;
        model.strategy.updatedAt = new Date().toISOString();

        // 2. Profiles
        const isaOwner = model.addOwner('ISA 계좌');
        const globalOwner = model.addOwner('해외직투');

        // 3. Nodes - ISA (1배 고정)
        model.addNode('asset', 'S&P 500 (ISA)', 6000000, 400, 100, isaOwner, 60);
        model.addNode('asset', 'Nasdaq (ISA)', 500000, 400, 200, isaOwner, 5);
        model.addNode('asset', 'Dividend (ISA)', 3500000, 400, 300, isaOwner, 35);
        
        // Update ISA nodes with specific tickers as sub-items (conceptually 100% of the node)
        model.nodes.find(n => n.name === 'S&P 500 (ISA)').subItems = [{ name: 'TIGER S&P500', ratio: 100 }];
        model.nodes.find(n => n.name === 'Nasdaq (ISA)').subItems = [{ name: 'TIGER 나스닥100', ratio: 100 }];
        model.nodes.find(n => n.name === 'Dividend (ISA)').subItems = [{ name: 'TIGER 미국배당다우존스', ratio: 100 }];

        // 4. Nodes - 해외직투 (S&P 레버리지 혼합)
        const spGlobal = model.addNode('asset', 'S&P 500 (Overseas)', 6000000, 600, 100, globalOwner, 60);
        const ndqGlobal = model.addNode('asset', 'Nasdaq (Overseas)', 500000, 600, 250, globalOwner, 5);
        const divGlobal = model.addNode('asset', 'Dividend (Overseas)', 3500000, 600, 350, globalOwner, 35);

        // Add sub-items breakdown for Overseas
        spGlobal.subItems = [
            { name: 'SSO', ratio: 70 },
            { name: 'VOO', ratio: 30 }
        ];
        ndqGlobal.subItems = [{ name: 'QQQM', ratio: 100 }];
        divGlobal.subItems = [{ name: 'SCHD', ratio: 100 }];

        // 5. Income & Buckets
        const salary = model.addNode('income', '급여', 5000000);
        const main = model.addNode('bucket', '급여통장', 0);
        
        model.addLink(salary.id, main.id, 5000000);
        
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
