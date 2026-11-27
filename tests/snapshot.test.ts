import { describe, expect, it } from 'vitest';
import { emptySnapshot, mergeSnapshots, planImport } from '../src/lib/snapshot';
import type { LearningSnapshot } from '../src/types/learning';

function cloud(): LearningSnapshot {
  const s = emptySnapshot();
  s.moduleNotes = { 0: '雲端既有筆記', 3: '第四章雲端筆記' };
  s.moduleProgress = [{ moduleId: 0, isCompleted: true, completedAt: '2026-01-01T00:00:00Z' }];
  s.videoProgress = [{ moduleId: 0, videoKey: 'builtin-0', watched: true, lastPositionSec: 300 }];
  s.cardReviews = [{ cardId: 'm00-c1', easeFactor: 2.6, intervalDays: 6, repetitions: 2, nextReviewAt: '2026-02-01T00:00:00Z', lastRating: 'good' }];
  return s;
}

function local(): LearningSnapshot {
  const s = emptySnapshot();
  s.moduleNotes = { 0: '本機訪客筆記', 5: '第六章本機筆記' };
  s.moduleProgress = [{ moduleId: 1, isCompleted: true, completedAt: '2026-01-02T00:00:00Z' }];
  s.videoProgress = [{ moduleId: 0, videoKey: 'builtin-0', watched: false, lastPositionSec: 10 }];
  return s;
}

describe('planImport：寫入的是合併結果，不覆蓋雲端既有資料', () => {
  it('要寫入儲存層的內容保留雲端既有筆記', () => {
    const { toWrite } = planImport(cloud(), local());
    expect(toWrite.moduleNotes[3]).toBe('第四章雲端筆記');
    expect(toWrite.moduleNotes[0]).toContain('雲端既有筆記');
    expect(toWrite.moduleNotes[0]).toContain('本機訪客筆記');
    expect(toWrite.moduleNotes[5]).toBe('第六章本機筆記');
  });

  it('進度取聯集、影片秒數取大且 watched 不被覆蓋為 false', () => {
    const { toWrite } = planImport(cloud(), local());
    expect(toWrite.moduleProgress.map((m) => m.moduleId).sort()).toEqual([0, 1]);
    const v = toWrite.videoProgress.find((x) => x.videoKey === 'builtin-0');
    expect(v?.watched).toBe(true);
    expect(v?.lastPositionSec).toBe(300);
  });

  it('閃卡排程不被較舊的資料倒退', () => {
    const inc = emptySnapshot();
    inc.cardReviews = [{ cardId: 'm00-c1', easeFactor: 2.5, intervalDays: 0, repetitions: 0, nextReviewAt: '2026-01-01T00:00:00Z', lastRating: 'again' }];
    const { toWrite } = planImport(cloud(), inc);
    expect(toWrite.cardReviews[0].repetitions).toBe(2);
  });

  it('匯入空資料不會清掉現有內容', () => {
    const { toWrite } = planImport(cloud(), emptySnapshot());
    expect(toWrite.moduleNotes[0]).toBe('雲端既有筆記');
    expect(toWrite.moduleProgress).toHaveLength(1);
  });

  it('merged 與 toWrite 一致，且不會修改傳入的物件', () => {
    const c = cloud();
    const before = JSON.stringify(c);
    const { merged, toWrite } = planImport(c, local());
    expect(toWrite).toEqual(merged);
    expect(JSON.stringify(c)).toBe(before);
  });

  it('重複合併同一份資料結果不變（冪等）', () => {
    const once = mergeSnapshots(cloud(), local());
    const twice = mergeSnapshots(once, local());
    expect(twice.moduleNotes).toEqual(once.moduleNotes);
  });
});
