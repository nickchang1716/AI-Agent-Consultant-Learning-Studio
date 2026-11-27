import { describe, expect, it } from 'vitest';
import { parseLegacyJson } from '../src/lib/legacyImport';

const good = { done: [0, 2], watched: { '0-0': true, '2-1': false }, notes: { '0': '筆記' }, last: 3 };

describe('legacyImport', () => {
  it('接受合法的舊版 JSON', () => {
    const r = parseLegacyJson(JSON.stringify(good));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.done).toEqual([0, 2]);
  });

  it('拒絕非 JSON', () => {
    const r = parseLegacyJson('{oops');
    expect(r.ok).toBe(false);
  });

  it('拒絕欄位缺漏或型別錯誤', () => {
    expect(parseLegacyJson('[]').ok).toBe(false);
    expect(parseLegacyJson(JSON.stringify({ ...good, done: 'x' })).ok).toBe(false);
    expect(parseLegacyJson(JSON.stringify({ ...good, done: [99] })).ok).toBe(false);
    expect(parseLegacyJson(JSON.stringify({ ...good, watched: { bad: true } })).ok).toBe(false);
    expect(parseLegacyJson(JSON.stringify({ ...good, notes: { '0': 5 } })).ok).toBe(false);
    expect(parseLegacyJson(JSON.stringify({ ...good, last: -1 })).ok).toBe(false);
  });

  it('不會被 __proto__ 污染', () => {
    const r = parseLegacyJson('{"done":[],"watched":{"__proto__":true},"notes":{},"last":0}');
    expect(r.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('done 去重', () => {
    const r = parseLegacyJson(JSON.stringify({ ...good, done: [1, 1, 2] }));
    expect(r.ok && r.data.done).toEqual([1, 2]);
  });
});
