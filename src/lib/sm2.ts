import type { CardReview, Rating } from '../types/learning';

const MIN_EASE = 1.3;
const AGAIN_MINUTES = 10;

export function newReview(cardId: string, now: Date = new Date()): CardReview {
  return { cardId, easeFactor: 2.5, intervalDays: 0, repetitions: 0, nextReviewAt: now.toISOString(), lastRating: null };
}

/** 簡化 SM-2：again 10 分鐘後重練；hard 短間隔；good 1 → 6 → interval × ease */
export function schedule(prev: CardReview, rating: Rating, now: Date = new Date()): CardReview {
  let { easeFactor, intervalDays, repetitions } = prev;
  let next: Date;

  if (rating === 'again') {
    repetitions = 0;
    intervalDays = 0;
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    next = new Date(now.getTime() + AGAIN_MINUTES * 60_000);
  } else if (rating === 'hard') {
    intervalDays = intervalDays <= 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    next = new Date(now.getTime() + intervalDays * 86_400_000);
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions += 1;
    easeFactor = easeFactor + 0.1;
    next = new Date(now.getTime() + intervalDays * 86_400_000);
  }

  return { ...prev, easeFactor, intervalDays, repetitions, nextReviewAt: next.toISOString(), lastRating: rating };
}

export function isDue(r: CardReview | undefined, now: Date = new Date()): boolean {
  return !r || new Date(r.nextReviewAt).getTime() <= now.getTime();
}
