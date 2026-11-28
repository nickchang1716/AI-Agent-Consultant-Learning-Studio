import { useRef, useState } from 'react';
import { Download, Moon, Sun, Upload } from 'lucide-react';
import { useLearning } from '../context/LearningContext';

const MAX_FILE = 5 * 1024 * 1024;

export default function SettingsPage({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { snap, setTheme, importLegacy, importBackup, exportBackup, isCloud, cloudAvailable, userEmail, pendingLocalMerge, mergeLocalToCloud, dismissLocalMerge } = useLearning();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const legacyRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  async function readFile(f: File | undefined): Promise<string | null> {
    if (!f) return null;
    if (f.size > MAX_FILE) {
      setMsg({ ok: false, text: '檔案過大（上限 5MB）。' });
      return null;
    }
    return f.text();
  }

  async function onLegacy(f: File | undefined) {
    const t = await readFile(f);
    if (t === null) return;
    const err = importLegacy(t);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: '舊版進度匯入成功（已與現有資料合併）。' });
  }
  async function onBackup(f: File | undefined) {
    const t = await readFile(f);
    if (t === null) return;
    const err = importBackup(t);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: '備份匯入成功（已與現有資料合併）。' });
  }
  function download() {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-consultant-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy dark:text-white">設定與備份</h1>

      <section className="card space-y-2">
        <h2 className="font-bold">儲存模式</h2>
        <p className="text-sm">{isCloud ? `雲端同步中（${userEmail ?? '已登入'}）` : cloudAvailable ? '本機訪客模式。點擊上方狀態徽章登入即可跨裝置同步。' : '本機訪客模式（尚未設定 Supabase，資料只存在這個瀏覽器）。'}</p>
        {pendingLocalMerge && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p>偵測到這台裝置有訪客學習紀錄，是否合併至雲端帳號？（合併不會覆蓋雲端既有資料。筆記圖片目前仍在本機，不會自動上傳。）</p>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={() => void mergeLocalToCloud()}>將本機進度合併至雲端</button>
              <button type="button" className="btn-ghost" onClick={dismissLocalMerge}>稍後再說</button>
            </div>
          </div>
        )}
        {cloudAvailable && (
          <button type="button" className="btn-ghost" onClick={onOpenAuth}>
            {isCloud ? '帳號管理（修改密碼／登出）' : '登入或註冊'}
          </button>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">外觀</h2>
        <button type="button" className="btn-ghost" onClick={() => setTheme(snap.preferences.theme === 'dark' ? 'light' : 'dark')}>
          {snap.preferences.theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          切換為{snap.preferences.theme === 'dark' ? '淺色' : '深色'}模式
        </button>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">匯入舊版進度</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">選擇舊版網頁匯出的 <code>AI-Agent-learning-progress.json</code>。格式不符時會顯示錯誤，不會影響現有資料。</p>
        <input ref={legacyRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onLegacy(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="btn-ghost" onClick={() => legacyRef.current?.click()}><Upload size={16} aria-hidden /> 匯入舊版 JSON</button>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">完整備份</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">備份包含進度、筆記、時間戳、自訂影片、閃卡排程與疑問箱（不含截圖檔案）。</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={download}><Download size={16} aria-hidden /> 匯出備份 JSON</button>
          <input ref={backupRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onBackup(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="btn-ghost" onClick={() => backupRef.current?.click()}><Upload size={16} aria-hidden /> 匯入備份</button>
        </div>
      </section>

      {msg && <p role="alert" className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{msg.text}</p>}
    </div>
  );
}
