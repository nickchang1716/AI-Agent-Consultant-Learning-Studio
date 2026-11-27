import { describe, expect, it } from 'vitest';
import { isDue, newReview, schedule } from '../src/lib/sm2';

const now = new Date('2026-01-01T00:00:00Z');
const days = (iso: string) => (new Date(iso).getTime() - now.getTime()) / 86_400_000;

describe('sm2', () => {
  it('good: 1 → 6 → interval × ease', () => {
    let r = newReview('x', now);
    r = schedule(r, 'good', now);
    expect(r.intervalDays).toBe(1);
    expect(r.repetitions).toBe(1);
    r = schedule(r, 'good', now);
    expect(r.intervalDays).toBe(6);
    const ease = r.easeFactor;
    r = schedule(r, 'good', now);
    expect(r.intervalDays).toBe(Math.round(6 * ease));
    expect(days(r.nextReviewAt)).toBe(r.intervalDays);
  });

  it('again: 重置 repetitions，10 分鐘後重練', () => {
    let r = schedule(schedule(newReview('x', now), 'good', now), 'good', now);
    r = schedule(r, 'again', now);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(0);
    expect(new Date(r.nextReviewAt).getTime() - now.getTime()).toBe(10 * 60_000);
    expect(r.lastRating).toBe('again');
  });

  it('hard: 新卡 1 天；既有間隔 × 1.2', () => {
    const first = schedule(newReview('x', now), 'hard', now);
    expect(first.intervalDays).toBe(1);
    const base = { ...newReview('x', now), intervalDays: 10, repetitions: 3 };
    expect(schedule(base, 'hard', now).intervalDays).toBe(12);
  });

  it('ease factor 不低於 1.3', () => {
    let r = newReview('x', now);
    for (let i = 0; i < 20; i++) r = schedule(r, 'again', now);
    expect(r.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('isDue', () => {
    expect(isDue(undefined, now)).toBe(true);
    const r = schedule(newReview('x', now), 'good', now);
    expect(isDue(r, now)).toBe(false);
    expect(isDue(r, new Date(now.getTime() + 2 * 86_400_000))).toBe(true);
  });
});
