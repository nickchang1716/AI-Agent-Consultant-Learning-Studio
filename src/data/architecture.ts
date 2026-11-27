import type { ArchNode } from '../types/learning';

export const archNodes: ArchNode[] = [
  {
    id: 'user', layer: 1, label: '理專工作台 / 使用者', subtitle: '入口與身分',
    analogy: '像銀行大廳的服務櫃台：客人（理專）從這裡提出需求，並出示身分。',
    scenario: '理專在工作台詢問「王先生適合再平衡嗎？」，系統帶入理專身分與分行。',
    pitfall: '身分與權限必須一路傳遞到後端，不能只在前端畫面隱藏選項。',
    moduleIds: [4, 11],
  },
  {
    id: 'orchestration', layer: 2, label: 'Agent Orchestration', subtitle: 'LangChain / LangGraph / Foundry',
    analogy: '像大堂經理：決定這件事找誰處理、先做哪一步、何時需要主管簽核。',
    scenario: '依問題分派給 ML 分群、RAG 查規範、並在下單前暫停等待人工核准。',
    pitfall: '自主程度越高風險越大；需最大步數、終止條件與 HITL 閘門。',
    moduleIds: [4, 5, 6],
  },
  {
    id: 'llm', layer: 3, label: 'LLM', subtitle: 'Foundry / vLLM',
    analogy: '像一位語言能力很強、但需要被查證的助理。',
    scenario: '把檢索到的內規與客戶資料整理成白話理財摘要。',
    pitfall: '模型不是資料庫；容量（VRAM、KV Cache）與併發要事先估算。',
    moduleIds: [0, 1, 5],
  },
  {
    id: 'ml', layer: 3, label: 'ML', subtitle: 'Azure ML',
    analogy: '像數據分析部門：根據歷史資料給出機率與分群。',
    scenario: '輸出客戶分群與未來 30 天購買傾向分數供 Agent 引用。',
    pitfall: '稀有事件別看 accuracy；注意資料洩漏與模型漂移。',
    moduleIds: [0, 2, 10],
  },
  {
    id: 'rag', layer: 3, label: 'RAG', subtitle: 'Azure AI Search',
    analogy: '像可即時翻閱的資料室，並附上出處頁碼。',
    scenario: '檢索高收益債銷售規範，依理專權限過濾後回答並附引文。',
    pitfall: '先檢查檢索與權限，再怪模型；ACL 要在檢索階段強制。',
    moduleIds: [3, 8],
  },
  {
    id: 'data', layer: 4, label: '企業資料與 API', subtitle: 'CRM / 商品 / 交易 / 內規',
    analogy: '像銀行的核心系統與檔案庫，是事實的來源。',
    scenario: 'Agent 透過受控 API 讀取客戶與商品，下單需經後端驗證與稽核。',
    pitfall: '資料品質與授權決定上限；客戶資料依賴須在方案中明確標示。',
    moduleIds: [2, 3, 11],
  },
  {
    id: 'governance', layer: 5, label: '跨層治理', subtitle: 'GPU / Cloud / 地端 · LangSmith / Evaluation · Guardrails / Model Card',
    analogy: '像稽核與風控：不直接做事，但決定能不能上線、出事如何追查。',
    scenario: '以 release gate 控管上線，以 Model Card 與 trace 供稽核。',
    pitfall: '安全需獨立 gate；private endpoint 不等於資料不出地端。',
    moduleIds: [7, 8, 9, 10],
  },
];
