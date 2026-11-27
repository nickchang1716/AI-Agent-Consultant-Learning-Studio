import { useState } from 'react';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';
import { formatTime } from '../../lib/youtube';
import type { PlayerHandle } from './YouTubeEmbedPlayer';
import type { RefObject } from 'react';

interface Props {
  moduleId: number;
  videoKey: string;
  playerRef: RefObject<PlayerHandle>;
}

export default function TimestampNotes({ moduleId, videoKey, playerRef }: Props) {
  const { snap, addTimestamp, updateTimestamp, deleteTimestamp } = useLearning();
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const notes = snap.timestampNotes
    .filter((n) => n.moduleId === moduleId && n.videoKey === videoKey)
    .sort((a, b) => a.timestampSec - b.timestampSec);

  function add() {
    if (!text.trim()) return;
    addTimestamp(moduleId, videoKey, playerRef.current?.getCurrentTime() ?? 0, text);
    setText('');
  }

  return (
    <div className="space-y-2">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="這個時間點的重點…" aria-label="時間戳筆記內容" maxLength={500} />
        <button type="submit" className="btn-primary shrink-0" disabled={!text.trim()}>
          <Plus size={16} aria-hidden /> 記錄此刻時間點
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">尚無時間戳筆記。播放影片後輸入重點並按下按鈕。</p>
      ) : (
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <button type="button" className="btn-ghost !min-h-[44px] shrink-0 font-mono text-teal" onClick={() => playerRef.current?.seekTo(n.timestampSec)} aria-label={`跳到 ${formatTime(n.timestampSec)}`}>
                {formatTime(n.timestampSec)}
              </button>
              {editId === n.id ? (
                <>
                  <input className="input" value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="編輯筆記" maxLength={500} />
                  <button type="button" className="btn-ghost !px-2" aria-label="儲存" onClick={() => { if (editText.trim()) updateTimestamp({ ...n, noteText: editText.trim() }); setEditId(null); }}>
                    <Check size={16} />
                  </button>
                  <button type="button" className="btn-ghost !px-2" aria-label="取消" onClick={() => setEditId(null)}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <p className="min-w-0 flex-1 break-words py-2 text-sm">{n.noteText}</p>
                  <button type="button" className="btn-ghost !px-2" aria-label="編輯" onClick={() => { setEditId(n.id); setEditText(n.noteText); }}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="btn-ghost !px-2" aria-label="刪除" onClick={() => deleteTimestamp(n.id)}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
