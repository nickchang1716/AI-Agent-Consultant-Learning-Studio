import { useMemo, useState } from 'react';
import { flashcards } from '../data/flashcards';
import { modules } from '../data/curriculum';
import { useLearning } from '../context/LearningContext';
import { isDue } from '../lib/sm2';
import type { Rating } from '../types/learning';

type Filter = 'due' | 'all' | number;

const RATINGS: { r: Rating; label: string; cls: string }[] = [
  { r: 'again', label: '忘記了', cls: 'bg-red-600 text-white hover:bg-red-700' },
  { r: 'hard', label: '有點模糊', cls: 'bg-amber-500 text-white hover:bg-amber-600' },
  { r: 'good', label: '秒懂', cls: 'bg-emerald-600 text-white hover:bg-emerald-700' },
];

export default function FlashcardsPage() {
  const { snap, rateCard } = useLearning();
  const [filter, setFilter] = useState<Filter>('due');
  const [flipped, setFlipped] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [noAnim, setNoAnim] = useState(false);

  const reviewMap = useMemo(() => new Map(snap.cardReviews.map((r) => [r.cardId, r])), [snap.cardReviews]);
  const dueCount = flashcards.filter((c) => isDue(reviewMap.get(c.id))).length;

  const deck = useMemo(() => {
    const now = new Date();
    let list = flashcards;
    if (filter === 'due') list = flashcards.filter((c) => isDue(reviewMap.get(c.id), now));
    else if (typeof filter === 'number') list = flashcards.filter((c) => c.moduleId === filter);
    // 到期者優先
    return [...list].sort((a, b) => Number(isDue(reviewMap.get(b.id), now)) - Number(isDue(reviewMap.get(a.id), now)));
  }, [filter, reviewMap]);

  const card = deck.length ? deck[Math.min(cursor, deck.length - 1)] : null;
  const rev = card ? reviewMap.get(card.id) : undefined;

  function change(f: Filter) {
    setFilter(f);
    setCursor(0);
    setNoAnim(true);
    setFlipped(false);
    window.setTimeout(() => setNoAnim(false), 60);
  }
  function rate(r: Rating) {
    if (!card) return;
    rateCard(card.id, r);
    // 換卡時先關閉動畫再翻回正面，避免下一張卡的答案在翻轉途中被看到
    setNoAnim(true);
    setFlipped(false);
    window.setTimeout(() => setNoAnim(false), 60);
    // due 模式下被評分的卡會離開牌堆，游標維持即可指向下一張
    if (filter !== 'due') setCursor((c) => (c + 1) % deck.length);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy dark:text-white">閃卡複習</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">共 {flashcards.length} 張，今日到期 <strong>{dueCount}</strong> 張。使用簡化 SM-2 間隔重複排程。</p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`btn border ${filter === 'due' ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`} onClick={() => change('due')}>今日到期</button>
        <button type="button" className={`btn border ${filter === 'all' ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`} onClick={() => change('all')}>全部</button>
        <label className="text-sm">
          <span className="sr-only">依章節篩選</span>
          <select className="input" value={typeof filter === 'number' ? String(filter) : ''} onChange={(e) => e.target.value !== '' && change(Number(e.target.value))}>
            <option value="">依章節篩選…</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{String(m.id + 1).padStart(2, '0')} {m.title}</option>)}
          </select>
        </label>
      </div>

      {!card ? (
        <div className="card text-center text-sm">
          {filter === 'due' ? '🎉 今天沒有到期的卡片了。可切換到「全部」或依章節繼續練習。' : '此範圍沒有卡片。'}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{Math.min(cursor, deck.length - 1) + 1} / {deck.length}{rev ? `　· 間隔 ${rev.intervalDays} 天、已連續答對 ${rev.repetitions} 次` : '　· 新卡'}</p>
          <div className="flip-scene">
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? '翻回正面' : '翻面看答案'}
              className={`flip-card block min-h-[300px] w-full text-left ${flipped ? 'flipped' : ''} ${noAnim ? '!transition-none' : ''}`}
            >
              <div className="flip-face card absolute inset-0 flex flex-col justify-center gap-3 overflow-y-auto" aria-hidden={flipped}>
                <span className="tag self-start">{String(card.moduleId + 1).padStart(2, '0')} {modules[card.moduleId].title}</span>
                <p className="text-2xl font-bold text-navy dark:text-white">{card.term}</p>
                <p className="text-lg text-slate-600 dark:text-slate-300">{card.termZh}</p>
                <p className="text-sm text-slate-500">情境：{card.hint}</p>
                <p className="text-xs text-slate-400">點擊翻面</p>
              </div>
              <div className="flip-face flip-back card absolute inset-0 space-y-2 overflow-y-auto text-sm" aria-hidden={!flipped}>
                <p><span className="font-semibold text-teal">白話定義：</span>{card.definition}</p>
                <p><span className="font-semibold text-teal">銀行實務：</span>{card.example}</p>
                <p><span className="font-semibold text-red-600">常被追問／地雷：</span>{card.followUp}</p>
              </div>
            </button>
          </div>

          {flipped ? (
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="自評">
              {RATINGS.map((x) => (
                <button key={x.r} type="button" className={`btn ${x.cls}`} onClick={() => rate(x.r)}>{x.label}</button>
              ))}
            </div>
          ) : (
            <button type="button" className="btn-primary w-full" onClick={() => setFlipped(true)}>顯示答案</button>
          )}
        </div>
      )}
    </div>
  );
}
