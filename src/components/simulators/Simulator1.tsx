import { useMemo, useState } from 'react';
import { recommend, type Approach, type Conditions } from '../../lib/decisionTree';
import { DEMO_PRICE_PER_MILLION, countChars, demoCost, tokenize } from '../../lib/tokenizer';

const QUESTIONS: { key: keyof Conditions; label: string }[] = [
  { key: 'freshData', label: '① 是否需要最新／內部動態資料？' },
  { key: 'style', label: '② 是否需要改變固定輸出風格或專業語氣？' },
  { key: 'citation', label: '③ 是否要求強制附上文件出處？' },
  { key: 'lowBudget', label: '④ 預算與維運門檻低？' },
];

const APPROACHES: { id: Approach; label: string; desc: string }[] = [
  { id: 'prompt', label: 'Prompt Engineering', desc: '指令與範例，成本最低' },
  { id: 'rag', label: 'RAG', desc: '回答時檢索外部知識，可附出處' },
  { id: 'finetune', label: 'Fine-tuning', desc: '更新權重，改變風格與行為' },
];

const SAMPLES = ['高收益債券基金申購門檻為新臺幣 100000 元，客戶 RR3 以上可購買。', 'Please summarize the client portfolio risk for Mr. Wang.'];
const KIND_COLORS: Record<string, string> = {
  cjk: 'bg-sky-200 text-sky-900',
  word: 'bg-amber-200 text-amber-900',
  num: 'bg-violet-200 text-violet-900',
  punct: 'bg-slate-300 text-slate-900',
};

export default function Simulator1() {
  const [c, setC] = useState<Conditions>({ freshData: true, style: false, citation: true, lowBudget: true });
  const rec = useMemo(() => recommend(c), [c]);
  const [text, setText] = useState(SAMPLES[0]);
  const toks = useMemo(() => tokenize(text.slice(0, 500)), [text]);
  const chars = countChars(text.slice(0, 500));

  return (
    <div className="space-y-6">
      <section aria-label="決策樹" className="space-y-3">
        <h3 className="font-bold">Prompt vs RAG vs Fine-tuning 決策樹</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <ul className="space-y-2">
            {QUESTIONS.map((q) => (
              <li key={q.key}>
                <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-600">
                  <span>{q.label}</span>
                  <input type="checkbox" className="h-6 w-6 shrink-0 accent-teal" checked={c[q.key]} onChange={(e) => setC({ ...c, [q.key]: e.target.checked })} />
                </label>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {APPROACHES.map((a) => {
                const on = rec.active.includes(a.id);
                return (
                  <div key={a.id} className={`rounded-lg border p-2 text-center text-xs transition ${on ? 'border-teal bg-teal text-white shadow' : 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-700'}`} aria-label={`${a.label}${on ? '（推薦）' : '（未推薦）'}`}>
                    <p className="font-semibold">{a.label}</p>
                    <p className="mt-1 opacity-90">{a.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="card text-sm" aria-live="polite">
              <p className="font-bold text-teal">推薦：{rec.title}</p>
              <p className="mt-1">{rec.reason}</p>
              <p className="mt-1 text-red-600">⚠ {rec.caution}</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Token 切分預覽" className="space-y-2">
        <h3 className="font-bold">Token 切分預覽</h3>
        <p className="text-xs text-slate-500">※ 教學示意估計：以啟發式規則切分，不是任何真實模型的分詞器；實際 Token 數請以所用模型的分詞器為準。</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s, i) => (
            <button key={i} type="button" className="btn-ghost text-xs" onClick={() => setText(s)}>範例 {i + 1}</button>
          ))}
        </div>
        <textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="輸入要切分的文字" />
        <div className="flex flex-wrap gap-0.5 rounded-lg border border-slate-200 p-2 dark:border-slate-700" aria-label="切分結果">
          {toks.map((t, i) => (
            <span key={i} className={`whitespace-pre rounded px-1 py-0.5 text-sm ${KIND_COLORS[t.kind]}`}>{t.text}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>字元數：<strong>{chars}</strong></span>
          <span>預估 Token 數：<strong>{toks.length}</strong></span>
          <span>約每 Token {toks.length ? (chars / toks.length).toFixed(2) : '0'} 字</span>
        </div>
        <p className="text-sm">
          計費概念：以假設單價 US${DEMO_PRICE_PER_MILLION}／百萬 Token 計，此句呼叫 1,000 次約 US${demoCost(toks.length).toFixed(4)}（假設值，非實際報價）。
        </p>
        <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">迷思破除：「1 個字 = 1 個 Token」不成立。中文可能 1~2 字一個 Token，英文單字常被切成多段，數字也會分段；成本與上下文長度都以 Token 計算。</p>
      </section>
    </div>
  );
}
