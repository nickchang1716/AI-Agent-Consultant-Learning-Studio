import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';
import { modules } from '../../data/curriculum';

export default function FloatingQuestionButton() {
  const { addQuestion } = useLearning();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const m = /^\/module\/(\d+)/.exec(loc.pathname);
  const moduleId = m && Number(m[1]) >= 0 && Number(m[1]) < modules.length ? Number(m[1]) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 z-40 inline-flex min-h-[48px] items-center gap-1 rounded-full bg-navy px-4 text-sm font-medium text-white shadow-lg hover:bg-slate-700 bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6"
      >
        <HelpCircle size={18} aria-hidden /> ？記下疑問
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="記下疑問">
          <form
            className="card w-full space-y-3 rounded-b-none sm:max-w-md sm:rounded-b-xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              addQuestion(moduleId, text);
              setText('');
              setOpen(false);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">記下疑問</h2>
              <button type="button" className="btn-ghost !px-2" onClick={() => setOpen(false)} aria-label="關閉"><X size={18} /></button>
            </div>
            {moduleId !== null && <p className="tag">章節：{String(moduleId + 1).padStart(2, '0')} {modules[moduleId].title}</p>}
            <textarea className="input min-h-[100px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="看不懂的名詞或 RFP 問題…" autoFocus maxLength={1000} aria-label="疑問內容" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>取消</button>
              <button type="submit" className="btn-primary" disabled={!text.trim()}>儲存</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
