import type { BlueprintData } from '../types/learning';

export const blueprints: BlueprintData[] = [
  {
    id: 'azureml',
    title: 'Azure ML Workspace 導覽',
    moduleId: 2,
    hotspots: [
      { id: 1, x: 12, y: 30, title: 'Compute', description: '管理訓練與推論用的運算資源（Compute Instance、Cluster）。', tip: '顧問重點：設定自動關機與配額，避免閒置 GPU 持續計費。' },
      { id: 2, x: 12, y: 50, title: 'Data', description: '註冊資料資產與 Datastore，讓 Job 以版本化方式引用資料。', tip: '顧問重點：資料需先經合規核可；標示資料期間以避免洩漏。' },
      { id: 3, x: 50, y: 28, title: 'Jobs / MLflow', description: '提交訓練 Job，並以 MLflow 追蹤參數、指標與產物。', tip: '顧問重點：每次實驗保留指標，驗收時可追溯。' },
      { id: 4, x: 50, y: 68, title: 'Model Registry', description: '登錄並版本化模型，連結訓練 Job 與評估結果。', tip: '顧問重點：上線前須有 Model Card 與核准紀錄。' },
      { id: 5, x: 84, y: 50, title: 'Online Endpoints', description: '將模型部署為即時 API，供 Agent 以工具方式呼叫。', tip: '顧問重點：並非每次 Agent 呼叫都要重訓；需監控延遲與漂移。' },
    ],
  },
  {
    id: 'foundry',
    title: 'Microsoft Foundry Playground 導覽',
    moduleId: 5,
    hotspots: [
      { id: 1, x: 14, y: 22, title: 'Model Deployment', description: '選擇已部署的模型與版本，決定部署型態與配額。', tip: '顧問重點：確認區域與模型可用性，並記錄成本。' },
      { id: 2, x: 14, y: 52, title: 'System Instructions', description: '設定 Agent 的角色、語氣與限制。', tip: '顧問重點：指令不能取代權限控管，授權須由後端強制。' },
      { id: 3, x: 50, y: 40, title: 'Tools / Knowledge (RAG)', description: '掛載工具與知識來源（例如 AI Search）。', tip: '顧問重點：檢索需帶 ACL，避免越權內容進入上下文。' },
      { id: 4, x: 86, y: 28, title: 'Temperature / Max Tokens', description: '調整生成隨機性與最大輸出長度。', tip: '顧問重點：金融場景偏低 temperature 以提高穩定度。' },
      { id: 5, x: 86, y: 68, title: 'Code Export', description: '將 Playground 設定匯出為 SDK／REST 範例。', tip: '顧問重點：Playground 僅為測試，整合需另行做驗證與監控。' },
    ],
  },
  {
    id: 'langsmith',
    title: 'LangSmith Trace 除錯畫面導覽',
    moduleId: 8,
    hotspots: [
      { id: 1, x: 14, y: 40, title: 'Run Tree', description: '以樹狀呈現一次請求中每個 LLM、檢索與工具呼叫步驟。', tip: '顧問重點：由此判斷錯在資料、檢索、工具或生成。' },
      { id: 2, x: 50, y: 14, title: 'Latency & Token Cost', description: '顯示每個步驟的延遲與 Token 成本。', tip: '顧問重點：驗收需同時記錄品質、成本與延遲。' },
      { id: 3, x: 50, y: 42, title: 'Retriever Docs', description: '顯示檢索回來的文件片段與分數。', tip: '顧問重點：檢查是否取到正確且有權限的文件。' },
      { id: 4, x: 50, y: 70, title: 'Tool Call Input/Output', description: '顯示工具呼叫的參數與回傳內容。', tip: '顧問重點：確認參數驗證與越權攔截是否生效。' },
      { id: 5, x: 86, y: 50, title: 'Feedback / Eval Score', description: '顯示人工回饋與自動評分結果。', tip: '顧問重點：回歸測試需對照 Golden Dataset 與 release gate。' },
    ],
  },
];
