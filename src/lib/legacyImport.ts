import type { LegacyProgress } from '../types/learning';

export type LegacyResult = { ok: true; data: LegacyProgress } | { ok: false; error: string };

const MAX_NOTE = 200_000;
const MODULE_COUNT = 12;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 舊版 key：watched["模組index-影片index"]、notes["模組index"] */
export function parseLegacyJson(text: string): LegacyResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON。' };
  }
  if (!isRecord(raw)) return { ok: false, error: '格式不符：最外層必須是物件。' };

  const { done, watched, notes, last } = raw;
  if (!Array.isArray(done) || !done.every((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < MODULE_COUNT)) {
    return { ok: false, error: '格式不符：done 必須是 0~11 的整數陣列。' };
  }
  if (!isRecord(watched)) return { ok: false, error: '格式不符：watched 必須是物件。' };
  const w: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(watched)) {
    if (!/^\d{1,2}-\d{1,2}$/.test(k) || typeof v !== 'boolean') {
      return { ok: false, error: `格式不符：watched 內含無效項目「${k.slice(0, 20)}」。` };
    }
    if (Number(k.split('-')[0]) >= MODULE_COUNT) return { ok: false, error: `格式不符：watched 模組編號超出範圍「${k}」。` };
    w[k] = v;
  }
  if (!isRecord(notes)) return { ok: false, error: '格式不符：notes 必須是物件。' };
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(notes)) {
    if (!/^\d{1,2}$/.test(k) || Number(k) >= MODULE_COUNT || typeof v !== 'string') {
      return { ok: false, error: `格式不符：notes 內含無效項目「${k.slice(0, 20)}」。` };
    }
    if (v.length > MAX_NOTE) return { ok: false, error: `格式不符：第 ${k} 章筆記過長。` };
    n[k] = v;
  }
  if (!Number.isInteger(last) || (last as number) < 0 || (last as number) >= MODULE_COUNT) {
    return { ok: false, error: '格式不符：last 必須是 0~11 的整數。' };
  }
  return { ok: true, data: { done: [...new Set(done as number[])], watched: w, notes: n, last: last as number } };
}
