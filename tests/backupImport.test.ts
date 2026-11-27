import { describe, expect, it } from 'vitest';
import { parseBackup } from '../src/lib/backupImport';

const wrap = (data: unknown) => JSON.stringify({ app: 'ai-consultant-studio', version: 1, data });

describe('backupImport', () => {
  it('拒絕非 JSON、非本系統備份', () => {
    expect(parseBackup('{oops').ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'other', data: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'ai-consultant-studio' })).ok).toBe(false);
  });

  it('moduleNotes 只接受 key 0..11 且 value 為字串', () => {
    const r = parseBackup(wrap({ moduleNotes: { '0': 'ok', '11': 'ok', '12': 'x', '-1': 'x', abc: 'x', '3': 123, '5': { a: 1 } } }));
    expect(r.ok && Object.keys(r.data.moduleNotes).sort()).toEqual(['0', '11']);
  });

  it('不會被 __proto__ 污染', () => {
    parseBackup('{"app":"ai-consultant-studio","data":{"moduleNotes":{"__proto__":"x"},"preferences":{"__proto__":{"polluted":true}}}}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('preferences 只取已知欄位並檢查型別與範圍', () => {
    const r = parseBackup(wrap({ preferences: { lastModuleId: 99, theme: 'neon', streakDays: -5, lastStudyDate: 'yesterday', evil: 1 } }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.preferences).toEqual({ lastModuleId: 0, theme: 'light', streakDays: 0, lastStudyDate: null });
      expect('evil' in r.data.preferences).toBe(false);
    }
  });

  it('接受合法 preferences', () => {
    const r = parseBackup(wrap({ preferences: { lastModuleId: 4, theme: 'dark', streakDays: 7, lastStudyDate: '2026-03-01' } }));
    expect(r.ok && r.data.preferences).toEqual({ lastModuleId: 4, theme: 'dark', streakDays: 7, lastStudyDate: '2026-03-01' });
  });

  it('丟棄不安全的自訂影片網址與超出範圍的章節', () => {
    const r = parseBackup(
      wrap({
        customVideos: [
          { id: 'a', moduleId: 1, title: 't', url: 'javascript:alert(1)', replacesIndex: null, createdAt: '2026-01-01T00:00:00Z' },
          { id: 'b', moduleId: 1, title: 't', url: 'https://example.com/v', replacesIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
          { id: 'c', moduleId: 99, title: 't', url: 'https://example.com/v', replacesIndex: null, createdAt: '2026-01-01T00:00:00Z' },
        ],
        moduleProgress: [{ moduleId: 99, isCompleted: true, completedAt: null }, { moduleId: 2, isCompleted: true, completedAt: null }],
      }),
    );
    expect(r.ok && r.data.customVideos.map((v) => v.id)).toEqual(['b']);
    expect(r.ok && r.data.moduleProgress.map((m) => m.moduleId)).toEqual([2]);
  });

  it('丟棄壞掉的閃卡排程', () => {
    const r = parseBackup(wrap({ cardReviews: [{ cardId: 'x', easeFactor: 0.1, intervalDays: 1, repetitions: 1, nextReviewAt: '2026-01-01T00:00:00Z' }, { cardId: 'y', easeFactor: 2.5, intervalDays: 1, repetitions: 1, nextReviewAt: 'not-a-date' }, { cardId: 'z', easeFactor: 2.5, intervalDays: 1, repetitions: 1, nextReviewAt: '2026-01-01T00:00:00Z', lastRating: 'wow' }] }));
    expect(r.ok && r.data.cardReviews.map((c) => c.cardId)).toEqual(['z']);
    expect(r.ok && r.data.cardReviews[0].lastRating).toBeNull();
  });
});
