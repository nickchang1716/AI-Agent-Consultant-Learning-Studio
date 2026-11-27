import type {
  CardReview,
  CustomVideo,
  LearningSnapshot,
  LegacyProgress,
  ModuleProgress,
  ParkingQuestion,
  Preferences,
  TimestampNote,
  VideoProgress,
} from '../types/learning';

export function emptySnapshot(): LearningSnapshot {
  return {
    preferences: { lastModuleId: 0, theme: 'light', streakDays: 0, lastStudyDate: null },
    moduleProgress: [],
    videoProgress: [],
    customVideos: [],
    moduleNotes: {},
    timestampNotes: [],
    cardReviews: [],
    parkingQuestions: [],
  };
}

export function isSnapshotEmpty(s: LearningSnapshot): boolean {
  return (
    s.moduleProgress.length === 0 &&
    s.videoProgress.length === 0 &&
    s.customVideos.length === 0 &&
    Object.values(s.moduleNotes).every((n) => n.trim() === '') &&
    s.timestampNotes.length === 0 &&
    s.cardReviews.length === 0 &&
    s.parkingQuestions.length === 0
  );
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const ta = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((tb - ta) / 86_400_000);
}

/** 連續學習天數：同日不變、隔天 +1、中斷則重算為 1 */
export function computeStreak(p: Preferences, today: string): Preferences {
  if (p.lastStudyDate === today) return p;
  const diff = p.lastStudyDate ? dayDiff(p.lastStudyDate, today) : null;
  const streakDays = diff === 1 ? p.streakDays + 1 : 1;
  return { ...p, streakDays, lastStudyDate: today };
}

function mergeNote(a: string, b: string): string {
  if (!b.trim() || a === b) return a;
  if (!a.trim()) return b;
  if (a.includes(b)) return a;
  return `${a}\n\n---\n（合併自另一份筆記）\n\n${b}`;
}

function byKey<T>(list: T[], key: (t: T) => string, pick: (a: T, b: T) => T, incoming: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of list) m.set(key(x), x);
  for (const x of incoming) {
    const k = key(x);
    const cur = m.get(k);
    m.set(k, cur ? pick(cur, x) : x);
  }
  return [...m.values()];
}

export interface MergeOptions {
  preferIncomingLast?: boolean;
}

/** 以聯集方式合併：進度取 OR、秒數取大、筆記不覆蓋（衝突時保留兩份） */
export function mergeSnapshots(base: LearningSnapshot, incoming: LearningSnapshot, opt: MergeOptions = {}): LearningSnapshot {
  const preferences: Preferences = {
    lastModuleId: opt.preferIncomingLast ? incoming.preferences.lastModuleId : base.preferences.lastModuleId,
    theme: base.preferences.theme,
    streakDays: Math.max(base.preferences.streakDays, incoming.preferences.streakDays),
    lastStudyDate: [base.preferences.lastStudyDate, incoming.preferences.lastStudyDate].filter((x): x is string => !!x).sort().pop() ?? null,
  };

  const moduleProgress = byKey<ModuleProgress>(
    base.moduleProgress,
    (m) => String(m.moduleId),
    (a, b) => (a.isCompleted ? a : b.isCompleted ? b : a),
    incoming.moduleProgress,
  );

  const videoProgress = byKey<VideoProgress>(
    base.videoProgress,
    (v) => `${v.moduleId}|${v.videoKey}`,
    (a, b) => ({ ...a, watched: a.watched || b.watched, lastPositionSec: Math.max(a.lastPositionSec, b.lastPositionSec) }),
    incoming.videoProgress,
  );

  const customVideos = byKey<CustomVideo>(base.customVideos, (v) => v.id, (a) => a, incoming.customVideos);

  const moduleNotes: Record<number, string> = { ...base.moduleNotes };
  for (const [k, v] of Object.entries(incoming.moduleNotes)) {
    const id = Number(k);
    moduleNotes[id] = mergeNote(moduleNotes[id] ?? '', v);
  }

  const timestampNotes = byKey<TimestampNote>(base.timestampNotes, (n) => n.id, (a) => a, incoming.timestampNotes);

  const cardReviews = byKey<CardReview>(
    base.cardReviews,
    (c) => c.cardId,
    (a, b) => (b.repetitions > a.repetitions || (b.repetitions === a.repetitions && b.nextReviewAt > a.nextReviewAt) ? b : a),
    incoming.cardReviews,
  );

  const parkingQuestions = byKey<ParkingQuestion>(
    base.parkingQuestions,
    (q) => q.id,
    (a, b) => (b.updatedAt > a.updatedAt ? b : a),
    incoming.parkingQuestions,
  );

  return { preferences, moduleProgress, videoProgress, customVideos, moduleNotes, timestampNotes, cardReviews, parkingQuestions };
}

/** 舊版 JSON → 快照；watched["m-v"] 對應 builtin-v */
export function legacyToSnapshot(l: LegacyProgress, nowIso: string = new Date().toISOString()): LearningSnapshot {
  const s = emptySnapshot();
  s.preferences.lastModuleId = l.last;
  s.moduleProgress = l.done.map((id) => ({ moduleId: id, isCompleted: true, completedAt: nowIso }));
  for (const [k, v] of Object.entries(l.watched)) {
    if (!v) continue;
    const [m, i] = k.split('-').map(Number);
    s.videoProgress.push({ moduleId: m, videoKey: `builtin-${i}`, watched: true, lastPositionSec: 0 });
  }
  for (const [k, v] of Object.entries(l.notes)) {
    if (v.trim()) s.moduleNotes[Number(k)] = v;
  }
  return s;
}
