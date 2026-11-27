import type { LearningSnapshot } from '../types/learning';
import { emptySnapshot } from './snapshot';
import { isSafeHttpUrl } from './youtube';

export type BackupResult = { ok: true; data: LearningSnapshot } | { ok: false; error: string };

const MAX_NOTE = 200_000;
const MODULES = 12;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function validModule(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < MODULES;
}
function str(v: unknown, max = 5000): v is string {
  return typeof v === 'string' && v.length <= max;
}
function iso(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}
function num(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

/** 解析並嚴格過濾完整備份 JSON；不合格的項目直接丟棄，不會拋出 */
export function parseBackup(text: string): BackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON。' };
  }
  if (!isRecord(raw) || raw.app !== 'ai-consultant-studio' || !isRecord(raw.data)) {
    return { ok: false, error: '這不是本系統的備份檔。' };
  }
  const d = raw.data;
  const s = emptySnapshot();

  // preferences：只取已知欄位並檢查型別
  if (isRecord(d.preferences)) {
    const p = d.preferences;
    if (validModule(p.lastModuleId)) s.preferences.lastModuleId = p.lastModuleId;
    if (p.theme === 'dark' || p.theme === 'light') s.preferences.theme = p.theme;
    if (num(p.streakDays, 0, 100_000) && Number.isInteger(p.streakDays)) s.preferences.streakDays = p.streakDays;
    if (typeof p.lastStudyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.lastStudyDate)) s.preferences.lastStudyDate = p.lastStudyDate;
  }

  if (Array.isArray(d.moduleProgress)) {
    for (const m of d.moduleProgress) {
      if (isRecord(m) && validModule(m.moduleId) && typeof m.isCompleted === 'boolean') {
        s.moduleProgress.push({ moduleId: m.moduleId, isCompleted: m.isCompleted, completedAt: iso(m.completedAt) ? m.completedAt : null });
      }
    }
  }
  if (Array.isArray(d.videoProgress)) {
    for (const v of d.videoProgress) {
      if (isRecord(v) && validModule(v.moduleId) && str(v.videoKey, 100) && typeof v.watched === 'boolean' && num(v.lastPositionSec, 0, 1_000_000)) {
        s.videoProgress.push({ moduleId: v.moduleId, videoKey: v.videoKey, watched: v.watched, lastPositionSec: Math.floor(v.lastPositionSec) });
      }
    }
  }
  if (Array.isArray(d.customVideos)) {
    for (const v of d.customVideos) {
      if (isRecord(v) && str(v.id, 100) && validModule(v.moduleId) && str(v.title, 200) && str(v.url, 2000) && isSafeHttpUrl(v.url)) {
        const ri = v.replacesIndex;
        s.customVideos.push({
          id: v.id,
          moduleId: v.moduleId,
          title: v.title,
          url: v.url,
          replacesIndex: typeof ri === 'number' && Number.isInteger(ri) && ri >= 0 && ri < 50 ? ri : null,
          createdAt: iso(v.createdAt) ? v.createdAt : new Date().toISOString(),
        });
      }
    }
  }
  // moduleNotes：僅允許 key 為 0..11 的整數字串、value 為字串
  if (isRecord(d.moduleNotes)) {
    for (const [k, v] of Object.entries(d.moduleNotes)) {
      if (/^\d{1,2}$/.test(k) && validModule(Number(k)) && typeof v === 'string' && v.length <= MAX_NOTE) {
        s.moduleNotes[Number(k)] = v;
      }
    }
  }
  if (Array.isArray(d.timestampNotes)) {
    for (const n of d.timestampNotes) {
      if (isRecord(n) && str(n.id, 100) && validModule(n.moduleId) && str(n.videoKey, 100) && num(n.timestampSec, 0, 1_000_000) && str(n.noteText, 500)) {
        s.timestampNotes.push({ id: n.id, moduleId: n.moduleId, videoKey: n.videoKey, timestampSec: Math.floor(n.timestampSec), noteText: n.noteText, createdAt: iso(n.createdAt) ? n.createdAt : new Date().toISOString() });
      }
    }
  }
  if (Array.isArray(d.cardReviews)) {
    for (const c of d.cardReviews) {
      if (isRecord(c) && str(c.cardId, 100) && num(c.easeFactor, 1.3, 10) && num(c.intervalDays, 0, 100_000) && num(c.repetitions, 0, 100_000) && iso(c.nextReviewAt)) {
        const lr = c.lastRating;
        s.cardReviews.push({
          cardId: c.cardId,
          easeFactor: c.easeFactor,
          intervalDays: Math.floor(c.intervalDays),
          repetitions: Math.floor(c.repetitions),
          nextReviewAt: c.nextReviewAt,
          lastRating: lr === 'again' || lr === 'hard' || lr === 'good' ? lr : null,
        });
      }
    }
  }
  if (Array.isArray(d.parkingQuestions)) {
    for (const q of d.parkingQuestions) {
      if (isRecord(q) && str(q.id, 100) && str(q.question, 1000) && typeof q.isResolved === 'boolean') {
        s.parkingQuestions.push({
          id: q.id,
          moduleId: validModule(q.moduleId) ? q.moduleId : null,
          question: q.question,
          answer: str(q.answer, 4000) ? q.answer : '',
          isResolved: q.isResolved,
          createdAt: iso(q.createdAt) ? q.createdAt : new Date().toISOString(),
          updatedAt: iso(q.updatedAt) ? q.updatedAt : new Date().toISOString(),
        });
      }
    }
  }
  return { ok: true, data: s };
}
