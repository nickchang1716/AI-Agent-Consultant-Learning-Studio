export interface Conditions {
  freshData: boolean; // ① 需要最新／內部動態資料
  style: boolean; // ② 需要改變固定輸出風格或專業語氣
  citation: boolean; // ③ 要求強制附上文件出處
  lowBudget: boolean; // ④ 預算與維運門檻低
}

export type Approach = 'prompt' | 'rag' | 'finetune';

export interface Recommendation {
  title: string;
  active: Approach[];
  reason: string;
  caution: string;
}

/** 教學用規則：資料時效／出處 → RAG；風格 → 先 Prompt，預算充足且風格穩定才考慮 Fine-tuning */
export function recommend(c: Conditions): Recommendation {
  const needRag = c.freshData || c.citation;
  const wantStyle = c.style;

  if (needRag && wantStyle && !c.lowBudget) {
    return {
      title: 'RAG + Fine-tuning（並搭配 Prompt）',
      active: ['rag', 'finetune', 'prompt'],
      reason: '內規與商品資料會變動且要附出處，必須用 RAG；固定的專業語氣與格式若 Prompt 無法穩定達成，且預算與維運能力足夠，才再加上 Fine-tuning。',
      caution: 'Fine-tuning 不能取代 RAG 來「記住」最新費率；需準備訓練資料並重新驗證每次更新。',
    };
  }
  if (needRag) {
    return {
      title: c.style ? 'RAG + Prompt Engineering' : 'RAG（+ 基本 Prompt）',
      active: c.style ? ['rag', 'prompt'] : ['rag', 'prompt'],
      reason: '回答依據來自會變動的內部資料或需要出處，應在回答時檢索文件並引用；語氣與格式先以 Prompt 範本處理即可。',
      caution: '先確認檢索取到正確且有權限的文件；證據不足時要求拒答。',
    };
  }
  if (wantStyle && !c.lowBudget) {
    return {
      title: 'Prompt Engineering → 必要時 Fine-tuning',
      active: ['prompt', 'finetune'],
      reason: '知識不需動態更新，主要是固定輸出風格。先用 Prompt 與範例（few-shot）；若仍不穩定且預算足夠，再評估 Fine-tuning。',
      caution: 'Fine-tuning 需資料、評估與版本管理，成本高於 Prompt。',
    };
  }
  return {
    title: 'Prompt Engineering',
    active: ['prompt'],
    reason: '不需要最新內部資料或強制出處，且預算與維運門檻低，優先用清楚的指令、範例與輸出格式限制。',
    caution: '若之後出現知識更新或出處需求，再導入 RAG；先建立 Golden Dataset 以便比較。',
  };
}
