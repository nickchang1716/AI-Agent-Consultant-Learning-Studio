import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CardReview,
  CustomVideo,
  LearningSnapshot,
  ModuleProgress,
  ParkingQuestion,
  Preferences,
  Rating,
  TimestampNote,
  VideoProgress,
} from '../../types/learning';
import { emptySnapshot } from '../../lib/snapshot';
import { uuid } from '../../lib/id';
import type { LearningRepository } from './LearningRepository';

export const SB_IMG_PREFIX = 'sb-img://';
const SIGNED_TTL = 3600;

type Row = Record<string, unknown>;

function num(v: unknown, d = 0): number {
  return typeof v === 'number' ? v : d;
}
function str(v: unknown, d = ''): string {
  return typeof v === 'string' ? v : d;
}
function rating(v: unknown): Rating | null {
  return v === 'again' || v === 'hard' || v === 'good' ? v : null;
}

function check(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}失敗：${error.message}`);
}

export class SupabaseRepository implements LearningRepository {
  readonly kind = 'cloud' as const;
  private signed = new Map<string, { url: string; exp: number }>();

  constructor(
    private readonly sb: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<LearningSnapshot> {
    const sb = this.sb;
    const [pref, mp, vp, cv, mn, tn, fr, pq] = await Promise.all([
      sb.from('user_preferences').select('*').maybeSingle(),
      sb.from('module_progress').select('*'),
      sb.from('video_progress').select('*'),
      sb.from('custom_videos').select('*'),
      sb.from('module_notes').select('*'),
      sb.from('timestamp_notes').select('*'),
      sb.from('flashcard_reviews').select('*'),
      sb.from('parking_lot_questions').select('*'),
    ]);
    check(pref.error, '讀取偏好');
    check(mp.error, '讀取章節進度');
    check(vp.error, '讀取影片進度');
    check(cv.error, '讀取自訂影片');
    check(mn.error, '讀取筆記');
    check(tn.error, '讀取時間戳筆記');
    check(fr.error, '讀取閃卡');
    check(pq.error, '讀取疑問箱');

    const s = emptySnapshot();
    const p = pref.data as Row | null;
    if (p) {
      s.preferences = {
        lastModuleId: num(p.last_module_id),
        theme: p.theme === 'dark' ? 'dark' : 'light',
        streakDays: num(p.streak_days),
        lastStudyDate: typeof p.last_study_date === 'string' ? p.last_study_date : null,
      };
    }
    s.moduleProgress = ((mp.data ?? []) as Row[]).map((r) => ({
      moduleId: num(r.module_id),
      isCompleted: r.is_completed === true,
      completedAt: typeof r.completed_at === 'string' ? r.completed_at : null,
    }));
    s.videoProgress = ((vp.data ?? []) as Row[]).map((r) => ({
      moduleId: num(r.module_id),
      videoKey: str(r.video_key),
      watched: r.watched === true,
      lastPositionSec: num(r.last_position_sec),
    }));
    s.customVideos = ((cv.data ?? []) as Row[]).map((r) => ({
      id: str(r.id),
      moduleId: num(r.module_id),
      title: str(r.title),
      url: str(r.url),
      replacesIndex: typeof r.replaces_index === 'number' ? r.replaces_index : null,
      createdAt: str(r.created_at),
    }));
    for (const r of (mn.data ?? []) as Row[]) s.moduleNotes[num(r.module_id)] = str(r.content_md);
    s.timestampNotes = ((tn.data ?? []) as Row[]).map((r) => ({
      id: str(r.id),
      moduleId: num(r.module_id),
      videoKey: str(r.video_key),
      timestampSec: num(r.timestamp_sec),
      noteText: str(r.note_text),
      createdAt: str(r.created_at),
    }));
    s.cardReviews = ((fr.data ?? []) as Row[]).map((r) => ({
      cardId: str(r.card_id),
      easeFactor: num(r.ease_factor, 2.5),
      intervalDays: num(r.interval_days),
      repetitions: num(r.repetitions),
      nextReviewAt: str(r.next_review_at),
      lastRating: rating(r.last_rating),
    }));
    s.parkingQuestions = ((pq.data ?? []) as Row[]).map((r) => ({
      id: str(r.id),
      moduleId: typeof r.module_id === 'number' ? r.module_id : null,
      question: str(r.question),
      answer: str(r.answer),
      isResolved: r.is_resolved === true,
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    }));
    return s;
  }

  private async upsert(table: string, row: Row, onConflict?: string): Promise<void> {
    const { error } = await this.sb.from(table).upsert({ ...row, user_id: this.userId }, onConflict ? { onConflict } : undefined);
    check(error, '寫入雲端');
  }

  private async remove(table: string, id: string): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq('id', id).eq('user_id', this.userId);
    check(error, '刪除雲端資料');
  }

  private prefRow(p: Preferences): Row {
    return {
      last_module_id: p.lastModuleId,
      theme: p.theme,
      streak_days: p.streakDays,
      last_study_date: p.lastStudyDate,
      updated_at: new Date().toISOString(),
    };
  }
  private mpRow(p: ModuleProgress): Row {
    return { module_id: p.moduleId, is_completed: p.isCompleted, completed_at: p.completedAt, updated_at: new Date().toISOString() };
  }
  private vpRow(v: VideoProgress): Row {
    return {
      module_id: v.moduleId,
      video_key: v.videoKey,
      watched: v.watched,
      last_position_sec: Math.max(0, Math.floor(v.lastPositionSec)),
      updated_at: new Date().toISOString(),
    };
  }
  private cvRow(v: CustomVideo): Row {
    return { id: v.id, module_id: v.moduleId, title: v.title, url: v.url, replaces_index: v.replacesIndex, created_at: v.createdAt };
  }
  private tnRow(n: TimestampNote): Row {
    return {
      id: n.id,
      module_id: n.moduleId,
      video_key: n.videoKey,
      timestamp_sec: Math.max(0, Math.floor(n.timestampSec)),
      note_text: n.noteText,
      created_at: n.createdAt,
    };
  }
  private frRow(r: CardReview): Row {
    return {
      card_id: r.cardId,
      ease_factor: r.easeFactor,
      interval_days: r.intervalDays,
      repetitions: r.repetitions,
      next_review_at: r.nextReviewAt,
      last_rating: r.lastRating,
      updated_at: new Date().toISOString(),
    };
  }
  private pqRow(q: ParkingQuestion): Row {
    return {
      id: q.id,
      module_id: q.moduleId,
      question: q.question,
      answer: q.answer,
      is_resolved: q.isResolved,
      created_at: q.createdAt,
      updated_at: q.updatedAt,
    };
  }

  savePreferences(p: Preferences) {
    return this.upsert('user_preferences', this.prefRow(p), 'user_id');
  }
  saveModuleProgress(p: ModuleProgress) {
    return this.upsert('module_progress', this.mpRow(p), 'user_id,module_id');
  }
  saveVideoProgress(v: VideoProgress) {
    return this.upsert('video_progress', this.vpRow(v), 'user_id,module_id,video_key');
  }
  saveCustomVideo(v: CustomVideo) {
    return this.upsert('custom_videos', this.cvRow(v), 'id');
  }
  deleteCustomVideo(id: string) {
    return this.remove('custom_videos', id);
  }
  saveModuleNote(moduleId: number, markdown: string) {
    return this.upsert('module_notes', { module_id: moduleId, content_md: markdown, updated_at: new Date().toISOString() }, 'user_id,module_id');
  }
  saveTimestampNote(n: TimestampNote) {
    return this.upsert('timestamp_notes', this.tnRow(n), 'id');
  }
  deleteTimestampNote(id: string) {
    return this.remove('timestamp_notes', id);
  }
  saveCardReview(r: CardReview) {
    return this.upsert('flashcard_reviews', this.frRow(r), 'user_id,card_id');
  }
  saveParking(q: ParkingQuestion) {
    return this.upsert('parking_lot_questions', this.pqRow(q), 'id');
  }
  deleteParking(id: string) {
    return this.remove('parking_lot_questions', id);
  }

  async importSnapshot(s: LearningSnapshot): Promise<void> {
    const uid = this.userId;
    const withUser = (rows: Row[]) => rows.map((r) => ({ ...r, user_id: uid }));
    const run = async (table: string, rows: Row[], onConflict: string) => {
      if (rows.length === 0) return;
      const { error } = await this.sb.from(table).upsert(withUser(rows), { onConflict });
      check(error, `匯入 ${table}`);
    };
    await run('user_preferences', [this.prefRow(s.preferences)], 'user_id');
    await run('module_progress', s.moduleProgress.map((p) => this.mpRow(p)), 'user_id,module_id');
    await run('video_progress', s.videoProgress.map((v) => this.vpRow(v)), 'user_id,module_id,video_key');
    await run('custom_videos', s.customVideos.map((v) => this.cvRow(v)), 'id');
    await run(
      'module_notes',
      Object.entries(s.moduleNotes)
        .filter(([, v]) => v.trim() !== '')
        .map(([k, v]) => ({ module_id: Number(k), content_md: v, updated_at: new Date().toISOString() })),
      'user_id,module_id',
    );
    await run('timestamp_notes', s.timestampNotes.map((n) => this.tnRow(n)), 'id');
    await run('flashcard_reviews', s.cardReviews.map((r) => this.frRow(r)), 'user_id,card_id');
    await run('parking_lot_questions', s.parkingQuestions.map((q) => this.pqRow(q)), 'id');
  }

  async uploadImage(moduleId: number, blob: Blob): Promise<string> {
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/gif' ? 'gif' : 'webp';
    const path = `${this.userId}/${moduleId}/${uuid()}.${ext}`;
    const { error } = await this.sb.storage.from('note-images').upload(path, blob, { contentType: blob.type || 'image/webp', upsert: false });
    check(error, '上傳圖片');
    return `${SB_IMG_PREFIX}${path}`;
  }

  async resolveImage(src: string): Promise<string | null> {
    if (!src.startsWith(SB_IMG_PREFIX)) return null;
    const path = src.slice(SB_IMG_PREFIX.length);
    // 只允許讀取自己資料夾；路徑穿越一律拒絕（RLS 為最終防線）
    if (!path.startsWith(`${this.userId}/`) || path.includes('..')) return null;
    const hit = this.signed.get(path);
    const now = Date.now();
    if (hit && hit.exp > now + 60_000) return hit.url;
    const { data, error } = await this.sb.storage.from('note-images').createSignedUrl(path, SIGNED_TTL);
    if (error || !data) return null;
    this.signed.set(path, { url: data.signedUrl, exp: now + SIGNED_TTL * 1000 });
    return data.signedUrl;
  }
}
