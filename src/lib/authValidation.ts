const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt 上限 72 bytes，超過會被靜默截斷

export function validateEmail(raw: string): string | null {
  const e = raw.trim();
  if (!e) return '請輸入 Email。';
  if (e.length > 254) return 'Email 過長（上限 254 字元）。';
  if (!EMAIL_RE.test(e)) return 'Email 格式不正確。';
  return null;
}

export function validatePassword(password: string): string | null {
  // bcrypt 以 bytes 計算：中文等多位元組字元要用 UTF-8 長度判斷，才不會被靜默截斷
  const bytes = new TextEncoder().encode(password).length;
  if (password.length < PASSWORD_MIN) return `密碼至少需要 ${PASSWORD_MIN} 個字元。`;
  if (bytes > PASSWORD_MAX) return `密碼過長（上限 ${PASSWORD_MAX} 個位元組，使用中文等字元時可輸入的字數會更少）。`;
  if (!/[A-Za-z]/.test(password)) return '密碼須包含至少 1 個英文字母。';
  if (!/[0-9]/.test(password)) return '密碼須包含至少 1 個數字。';
  return null;
}

export function validateSignUp(email: string, password: string, confirmPassword: string): string | null {
  return validateEmail(email) ?? validatePassword(password) ?? (password === confirmPassword ? null : '兩次輸入的密碼不一致。');
}

/** 將 Supabase Auth 英文錯誤轉為繁體中文；登入失敗一律不透露帳號是否存在 */
export function mapAuthError(message: string): string {
  const m = (message ?? '').toString().toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) return '帳號或密碼錯誤，請重新確認。';
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) return '此帳號尚未完成信箱驗證，請至信箱點擊連結，或洽管理員關閉信箱驗證設定。';
  if (m.includes('user already registered') || m.includes('already been registered')) return '此 Email 已被註冊，請直接切換至「登入」。';
  if (m.includes('signups not allowed') || m.includes('signup is disabled') || m.includes('signup_disabled')) return '目前暫停開放新帳號註冊，請洽管理員。';
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_request_rate_limit')) return '嘗試次數過多，請稍候幾分鐘再試。';
  // 先判斷「新舊密碼相同」，再判斷一般的密碼強度錯誤（兩者都含 "password"）
  if (m.includes('same password') || m.includes('same_password') || m.includes('different from the old password')) return '新密碼不可與目前密碼相同。';
  if (m.includes('password')) return '密碼不符合強度要求（至少 8 碼，且包含英文與數字）。';
  const short = (message ?? '').toString().trim();
  return short && short !== '[object Object]' ? `發生錯誤：${short.slice(0, 120)}` : '發生未知錯誤，請稍後再試。';
}
