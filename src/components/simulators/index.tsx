import type { ReactElement } from 'react';
import type { SimulatorId } from '../../types/learning';
import Simulator1 from './Simulator1';
import Simulator2 from './Simulator2';
import Simulator3 from './Simulator3';
import Simulator4 from './Simulator4';
import Simulator5 from './Simulator5';

export const SIM_META: Record<SimulatorId, { title: string; summary: string; moduleIds: number[] }> = {
  sim1: { title: 'Simulator 1：Prompt vs RAG vs Fine-tuning ＋ Token 切分', summary: '切換 4 個條件看推薦組合，並觀察中英文 Token 切分差異。', moduleIds: [0] },
  sim2: { title: 'Simulator 2：LLM VRAM & GPU 硬體估算器', summary: '調整模型大小、量化、上下文與併發，拆解權重／KV Cache／Overhead。', moduleIds: [1] },
  sim3: { title: 'Simulator 3：RAG 切片、Top-K 與 ACL 權限過濾', summary: '用虛構銀行語料觀察切片、檢索、權限與版本過濾。', moduleIds: [3] },
  sim4: { title: 'Simulator 4：Tool Calling & HITL 步進執行器', summary: '逐步檢視 JSON Tool Call、HITL 暫停與白名單攔截。', moduleIds: [4, 6] },
  sim5: { title: 'Simulator 5：Release Gate & 紅隊儀表板', summary: '比較三個候選版本，理解為何高品質仍須被安全閘門擋下。', moduleIds: [8, 9] },
};

export function renderSimulator(id: SimulatorId, moduleId?: number): ReactElement {
  switch (id) {
    case 'sim1':
      return <Simulator1 />;
    case 'sim2':
      return <Simulator2 />;
    case 'sim3':
      return <Simulator3 />;
    case 'sim4':
      // Module 05 預設模式 A；Module 07 預設模式 B
      return <Simulator4 key={moduleId} defaultMode={moduleId === 6 ? 'B' : 'A'} />;
    case 'sim5':
      return <Simulator5 />;
  }
}
