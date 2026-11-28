import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';
import { PASSWORD_MAX, validateEmail, validatePassword, validateSignUp } from '../../lib/authValidation';

type Tab = 'login' | 'signup';
type Msg = { ok: boolean; text: string } | null;

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  show?: boolean;
  onToggle?: () => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm" htmlFor={id}>{label}</label>
      <div className="relative mt-1">
        <input
          id={id}
          className={`input ${onToggle ? 'pr-12' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={PASSWORD_MAX}
          required
        />
        {onToggle && (
          <button type="button" onClick={onToggle} aria-label={show ? '隱藏密碼' : '顯示密碼'} aria-pressed={show} className="absolute right-0 top-0 flex h-[44px] w-[44px] items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ChangePassword() {
  const { updatePassword } = useLearning();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  function reset() {
    setPw('');
    setPw2('');
    setShow(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = validatePassword(pw) ?? (pw === pw2 ? null : '兩次輸入的密碼不一致。');
    if (v) return setMsg({ ok: false, text: v });
    setBusy(true);
    const err = await updatePassword(pw);
    setBusy(false);
    if (err) return setMsg({ ok: false, text: err });
    reset();
    setOpen(false);
    setMsg({ ok: true, text: '密碼已更新。' });
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-ghost w-full" aria-expanded={open} onClick={() => { setOpen((o) => !o); setMsg(null); reset(); }}>
        修改密碼
      </button>
      {open && (
        <form className="space-y-2" onSubmit={(e) => void submit(e)}>
          <PasswordField id="new-pw" label="新密碼" value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={() => setShow((s) => !s)} hint="至少 8 碼，須包含英文字母與數字" />
          <PasswordField id="new-pw2" label="確認新密碼" value={pw2} onChange={setPw2} autoComplete="new-password" show={show} />
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? '更新中…' : '更新密碼'}</button>
        </form>
      )}
      {msg && (
        <p role="alert" className={`rounded-lg p-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</p>
      )}
    </div>
  );
}

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { cloudAvailable, isCloud, userEmail, signInWithPassword, signUpWithPassword, signOut } = useLearning();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  function switchTab(t: Tab) {
    if (t === tab) return;
    setTab(t);
    setMsg(null);
    setPw('');
    setPw2('');
    setShow(false);
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = validateEmail(email);
    if (v) return setMsg({ ok: false, text: v });
    setBusy(true);
    const err = await signInWithPassword(email, pw);
    setBusy(false);
    if (err) return setMsg({ ok: false, text: err });
    setPw('');
    onClose();
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = validateSignUp(email, pw, pw2);
    if (v) return setMsg({ ok: false, text: v });
    setBusy(true);
    const r = await signUpWithPassword(email, pw);
    setBusy(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setPw('');
    setPw2('');
    if (r.needsConfirmation) return setMsg({ ok: true, text: '註冊成功！請至信箱點擊驗證連結後，再回來登入。' });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={isCloud ? '帳號與同步' : '登入或註冊'}>
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
            <p>已登入：<strong className="break-all">{userEmail ?? '（未提供 Email）'}</strong></p>
            <ChangePassword />
            <button type="button" className="btn-ghost w-full" onClick={() => void signOut().then(onClose)}>
              登出（回到本機訪客模式）
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div role="tablist" aria-label="登入或註冊" className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
              {([['login', '登入'], ['signup', '註冊新帳號']] as const).map(([k, label]) => (
                <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="auth-panel" onClick={() => switchTab(k)} className={`min-h-[44px] text-sm font-medium ${tab === k ? 'bg-teal text-white' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {tab === 'login' ? (
                <form className="space-y-3" onSubmit={(e) => void onLogin(e)} noValidate>
                  <div>
                    <label className="block text-sm" htmlFor="auth-email">Email</label>
                    <input id="auth-email" className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
                  </div>
                  <PasswordField id="auth-pw" label="密碼" value={pw} onChange={setPw} autoComplete="current-password" show={show} onToggle={() => setShow((s) => !s)} />
                  <button type="submit" disabled={busy || !email || !pw} className="btn-primary w-full">{busy ? '登入中…' : '登入'}</button>
                  <p className="text-xs text-slate-500">忘記密碼？請聯繫網站管理員協助重設。</p>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={(e) => void onSignUp(e)} noValidate>
                  <div>
                    <label className="block text-sm" htmlFor="auth-email-s">Email</label>
                    <input id="auth-email-s" className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
                  </div>
                  <PasswordField id="auth-pw-s" label="密碼" value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={() => setShow((s) => !s)} hint="至少 8 碼，須包含英文字母與數字" />
                  <PasswordField id="auth-pw2-s" label="確認密碼" value={pw2} onChange={setPw2} autoComplete="new-password" show={show} />
                  <button type="submit" disabled={busy || !email || !pw || !pw2} className="btn-primary w-full">{busy ? '建立中…' : '建立帳號並登入'}</button>
                </form>
              )}
            </div>
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
