import type {
  CardReview,
  CustomVideo,
  LearningSnapshot,
  ModuleProgress,
  ParkingQuestion,
  Preferences,
  TimestampNote,
  VideoProgress,
} from '../../types/learning';
import { emptySnapshot, isSnapshotEmpty, mergeSnapshots } from '../../lib/snapshot';
import type { LearningRepository } from './LearningRepository';
import { getLocalImage, putLocalImage } from './localImages';

export const LOCAL_KEY = 'acs.snapshot.v1';

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function readLocalSnapshot(): LearningSnapshot {
  const base = emptySnapshot();
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<LearningSnapshot> | null;
    if (!p || typeof p !== 'object') return base;
    return {
      preferences: { ...base.preferences, ...(p.preferences ?? {}) },
      moduleProgress: arr<ModuleProgress>(p.moduleProgress),
      videoProgress: arr<VideoProgress>(p.videoProgress),
      customVideos: arr<CustomVideo>(p.customVideos),
      moduleNotes: p.moduleNotes && typeof p.moduleNotes === 'object' ? p.moduleNotes : {},
      timestampNotes: arr<TimestampNote>(p.timestampNotes),
      cardReviews: arr<CardReview>(p.cardReviews),
      parkingQuestions: arr<ParkingQuestion>(p.parkingQuestions),
    };
  } catch {
    return base;
  }
}

export function localHasData(): boolean {
  return !isSnapshotEmpty(readLocalSnapshot());
}

export function clearLocalSnapshot(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

function upsertBy<T>(list: T[], item: T, same: (a: T) => boolean): T[] {
  const i = list.findIndex(same);
  if (i < 0) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export class LocalRepository implements LearningRepository {
  readonly kind = 'local' as const;
  private snap: LearningSnapshot = readLocalSnapshot();

  private persist(): Promise<void> {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.snap));
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error('本機儲存失敗（空間不足或瀏覽器封鎖儲存）'));
    }
  }

  async load(): Promise<LearningSnapshot> {
    this.snap = readLocalSnapshot();
    return this.snap;
  }
  savePreferences(p: Preferences) {
    this.snap = { ...this.snap, preferences: p };
    return this.persist();
  }
  saveModuleProgress(p: ModuleProgress) {
    this.snap = { ...this.snap, moduleProgress: upsertBy(this.snap.moduleProgress, p, (x) => x.moduleId === p.moduleId) };
    return this.persist();
  }
  saveVideoProgress(v: VideoProgress) {
    this.snap = {
      ...this.snap,
      videoProgress: upsertBy(this.snap.videoProgress, v, (x) => x.moduleId === v.moduleId && x.videoKey === v.videoKey),
    };
    return this.persist();
  }
  saveCustomVideo(v: CustomVideo) {
    this.snap = { ...this.snap, customVideos: upsertBy(this.snap.customVideos, v, (x) => x.id === v.id) };
    return this.persist();
  }
  deleteCustomVideo(id: string) {
    this.snap = { ...this.snap, customVideos: this.snap.customVideos.filter((v) => v.id !== id) };
    return this.persist();
  }
  saveModuleNote(moduleId: number, markdown: string) {
    this.snap = { ...this.snap, moduleNotes: { ...this.snap.moduleNotes, [moduleId]: markdown } };
    return this.persist();
  }
  saveTimestampNote(n: TimestampNote) {
    this.snap = { ...this.snap, timestampNotes: upsertBy(this.snap.timestampNotes, n, (x) => x.id === n.id) };
    return this.persist();
  }
  deleteTimestampNote(id: string) {
    this.snap = { ...this.snap, timestampNotes: this.snap.timestampNotes.filter((n) => n.id !== id) };
    return this.persist();
  }
  saveCardReview(r: CardReview) {
    this.snap = { ...this.snap, cardReviews: upsertBy(this.snap.cardReviews, r, (x) => x.cardId === r.cardId) };
    return this.persist();
  }
  saveParking(q: ParkingQuestion) {
    this.snap = { ...this.snap, parkingQuestions: upsertBy(this.snap.parkingQuestions, q, (x) => x.id === q.id) };
    return this.persist();
  }
  deleteParking(id: string) {
    this.snap = { ...this.snap, parkingQuestions: this.snap.parkingQuestions.filter((q) => q.id !== id) };
    return this.persist();
  }
  importSnapshot(s: LearningSnapshot) {
    this.snap = mergeSnapshots(this.snap, s);
    return this.persist();
  }
  async uploadImage(_moduleId: number, blob: Blob): Promise<string> {
    return putLocalImage(blob);
  }
  resolveImage(src: string): Promise<string | null> {
    return getLocalImage(src);
  }
}
