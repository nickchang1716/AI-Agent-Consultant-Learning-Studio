import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { modules } from '../data/curriculum';
import type { ParkingQuestion } from '../types/learning';

function Item({ q }: { q: ParkingQuestion }) {
  const { updateQuestion, deleteQuestion } = useLearning();
  const [ans, setAns] = useState(q.answer);
  return (
    <li className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {q.moduleId !== null && modules[q.moduleId] && (
            <Link to={`/module/${q.moduleId}`} className="tag mb-1">{String(q.moduleId + 1).padStart(2, '0')} {modules[q.moduleId].title}</Link>
          )}
          <p className="break-words font-medium">{q.question}</p>
        </div>
        <button type="button" className="btn-ghost !px-2" aria-label="刪除疑問" onClick={() => { if (window.confirm('確定刪除這則疑問？')) deleteQuestion(q.id); }}><Trash2 size={16} /></button>
      </div>
      <textarea className="input min-h-[80px]" value={ans} onChange={(e) => setAns(e.target.value)} placeholder="學懂之後，寫下自己的解答…" aria-label="我的解答" maxLength={4000} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={ans === q.answer} onClick={() => updateQuestion({ ...q, answer: ans })}>儲存解答</button>
        <button type="button" className={q.isResolved ? 'btn-ghost' : 'btn-primary'} onClick={() => updateQuestion({ ...q, answer: ans, isResolved: !q.isResolved })}>
          {q.isResolved ? '重新開啟' : '標記已解決'}
        </button>
      </div>
    </li>
  );
}

export default function ParkingLotPage() {
  const { snap, addQuestion } = useLearning();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [text, setText] = useState('');
  const [mod, setMod] = useState<number | ''>('');

  const list = snap.parkingQuestions.filter((q) => q.isResolved === (tab === 'resolved')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openCount = snap.parkingQuestions.filter((q) => !q.isResolved).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy dark:text-white">疑問箱</h1>
      <form
        className="card space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addQuestion(mod === '' ? null : mod, text);
          setText('');
        }}
      >
        <textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="記下看不懂的名詞或 RFP 問題…" aria-label="新疑問" maxLength={1000} />
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto min-w-0 max-w-full flex-1 sm:flex-none" value={mod} onChange={(e) => setMod(e.target.value === '' ? '' : Number(e.target.value))} aria-label="所屬章節">
            <option value="">一般（跨章節）</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{String(m.id + 1).padStart(2, '0')} {m.title}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={!text.trim()}>新增</button>
        </div>
      </form>

      <div role="tablist" className="flex gap-2">
        <button type="button" role="tab" aria-selected={tab === 'open'} className={`btn border ${tab === 'open' ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`} onClick={() => setTab('open')}>未解決（{openCount}）</button>
        <button type="button" role="tab" aria-selected={tab === 'resolved'} className={`btn border ${tab === 'resolved' ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`} onClick={() => setTab('resolved')}>已解決（{snap.parkingQuestions.length - openCount}）</button>
      </div>

      {list.length === 0 ? <p className="text-sm text-slate-500">這裡還沒有項目。</p> : <ul className="space-y-3">{list.map((q) => <Item key={`${q.id}-${q.updatedAt}`} q={q} />)}</ul>}
    </div>
  );
}
