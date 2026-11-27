/** 僅允許 http(s)；拒絕 javascript: 等其他協定 */
export function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSearchUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    // 只接受 youtube.com 與其子網域，避免 notyoutube.com 之類被誤判
    return /(^|\.)youtube\.com$/.test(u.hostname) && u.pathname.startsWith('/results');
  } catch {
    return false;
  }
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** 解析 watch?v= / youtu.be / embed；搜尋頁與非 YouTube 回傳 null */
export function parseYouTubeId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname.startsWith('/results')) return null;
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] ?? null;
  }
  return id && ID_RE.test(id) ? id : null;
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
