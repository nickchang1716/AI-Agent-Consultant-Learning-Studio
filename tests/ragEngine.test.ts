import { describe, expect, it } from 'vitest';
import { CORPUS, PRESET_QUESTIONS, chunkText, retrieve } from '../src/lib/ragEngine';

const q = (id: string) => PRESET_QUESTIONS.find((p) => p.id === id)!.text;

describe('ragEngine', () => {
  it('chunkText：重疊區正確、涵蓋全文', () => {
    const text = 'a'.repeat(250);
    const cs = chunkText('X', text, 100, 20);
    expect(cs[0].end - cs[1].start).toBe(20);
    expect(cs[cs.length - 1].end).toBe(250);
  });

  it('chunkText：overlap 不小於 size 時不會無限迴圈', () => {
    expect(chunkText('X', 'abcdefghij', 5, 99).length).toBeGreaterThan(0);
  });

  it('有答案題：一般理專可取得文件 A', () => {
    const r = retrieve(q('answer'), '一般理專', 3, 120, 20);
    expect(r.answerable).toBe(true);
    expect(r.context[0].docId).toBe('A');
  });

  it('越權題：一般理專被 ACL 攔截且不得進入 context', () => {
    const r = retrieve(q('unauthorized'), '一般理專', 5, 120, 20);
    expect(r.scored.some((c) => c.verdict === 'acl_blocked' && c.docId === 'B')).toBe(true);
    expect(r.context.some((c) => c.docId === 'B')).toBe(false);
  });

  it('越權題：分行主管可取得文件 B', () => {
    const r = retrieve(q('unauthorized'), '分行主管', 3, 120, 20);
    expect(r.context.some((c) => c.docId === 'B')).toBe(true);
  });

  it('過期文件不得進入 context', () => {
    const r = retrieve('美元一年期定存專案利率是多少？', '分行主管', 5, 120, 20);
    expect(r.context.some((c) => c.docId === 'C')).toBe(false);
    expect(r.scored.some((c) => c.verdict === 'expired_blocked')).toBe(true);
  });

  it('無答案題：沒有任何可用片段時不可回答', () => {
    const r = retrieve(q('noanswer'), '分行主管', 3, 120, 20);
    expect(r.answerable).toBe(false);
  });

  it('語料庫為 3 份文件', () => {
    expect(CORPUS).toHaveLength(3);
  });
});
