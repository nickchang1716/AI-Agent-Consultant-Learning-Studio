import { useState } from 'react';
import { Github, Mail, X } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';

/** Google / GitHub 登入需先在 Supabase 設定 Provider；設定完成後改為 true 即可顯示按鈕 */
const SHOW_OAUTH = false;

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { cloudAvailable, isCloud, userEmail, signInOAuth, signInEmail, signOut } = useLearning();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<string | null>, okText?: string) {
    setBusy(true);
    setMsg(null);
    const err = await fn();
    setBusy(false);
    if (err) setMsg({ ok: false, text: err });
    else if (okText) setMsg({ ok: true, text: okText });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="登入">
      <div className="card max-h-[90vh] w-full overflow-y-auto rounded-b-none sm:max-w-md sm:rounded-b-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isCloud ? '帳號與同步' : '登入以跨裝置同步'}</h2>
          <button type="button" className="btn-ghost !px-2" onClick={onClose} aria-label="關閉">
            <X size={18} />
          </button>
        </div>

        {!cloudAvailable ? (
          <div className="mt-3 space-y-2 text-sm">
            <p>目前未設定 Supabase，App 以「本機訪客模式」運作，所有功能皆可使用，資料存在這台裝置的瀏覽器。</p>
            <p className="text-slate-500">要啟用雲端同步，請依 README 設定 <code>.env</code> 的 <code>VITE_SUPABASE_URL</code> 與 <code>VITE_SUPABASE_ANON_KEY</code>。</p>
          </div>
        ) : isCloud ? (
          <div className="mt-3 space-y-3 text-sm">
            <p>已登入：<strong>{userEmail ?? '（未提供 Email）'}</strong></p>
            <button type="button" className="btn-ghost w-full" onClick={() => run(async () => { await signOut(); onClose(); return null; })}>
              登出（回到本機訪客模式）
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {SHOW_OAUTH && (
              <>
                <button type="button" disabled={busy} className="btn-primary w-full" onClick={() => run(() => signInOAuth('google'))}>
                  使用 Google 登入
                </button>
                <button type="button" disabled={busy} className="btn-ghost w-full" onClick={() => run(() => signInOAuth('github'))}>
                  <Github size={16} aria-hidden /> 使用 GitHub 登入
                </button>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-px flex-1 bg-slate-300" /> 或 <span className="h-px flex-1 bg-slate-300" />
                </div>
              </>
            )}
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => signInEmail(email), '登入連結已寄出，請到信箱點擊連結（Magic Link）。');
              }}
            >
              <label className="block text-sm" htmlFor="auth-email">Email Magic Link</label>
              <input id="auth-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              <button type="submit" disabled={busy || !email} className="btn-ghost w-full">
                <Mail size={16} aria-hidden /> 寄送登入連結
              </button>
            </form>
          </div>
        )}

        {msg && (
          <p role="alert" className={`mt-3 rounded-lg p-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
