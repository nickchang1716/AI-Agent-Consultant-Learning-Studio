/**
 * 教學示意用的啟發式分詞器（非任何真實模型的分詞器）。
 * - 中日韓字元：約每 1~2 字一個 Token（以 1.5 字為近似，奇偶交替切 1／2 字）
 * - 英文單字：長單字依每 4 字元切段
 * - 數字：每 3 位一段
 * - 標點與空白：各自 1 個 Token（空白附著於下一個英文單字）
 */
export interface Tok {
  text: string;
  kind: 'cjk' | 'word' | 'num' | 'punct';
}

const CJK = /[㐀-鿿豈-﫿]/;
const WORD = /[A-Za-z]/;
const DIGIT = /[0-9]/;
const SPACE = /\s/;

export function tokenize(input: string): Tok[] {
  const out: Tok[] = [];
  const chars = Array.from(input);
  let i = 0;
  let cjkFlip = false;
  while (i < chars.length) {
    const ch = chars[i];
    if (CJK.test(ch)) {
      const take = cjkFlip && i + 1 < chars.length && CJK.test(chars[i + 1]) ? 2 : 1;
      out.push({ text: chars.slice(i, i + take).join(''), kind: 'cjk' });
      i += take;
      cjkFlip = !cjkFlip;
    } else if (WORD.test(ch) || (SPACE.test(ch) && i + 1 < chars.length && WORD.test(chars[i + 1]))) {
      let lead = '';
      if (SPACE.test(ch)) {
        lead = ' ';
        i++;
      }
      let w = '';
      while (i < chars.length && WORD.test(chars[i])) w += chars[i++];
      const first = lead + w.slice(0, 4);
      out.push({ text: first, kind: 'word' });
      for (let p = 4; p < w.length; p += 4) out.push({ text: w.slice(p, p + 4), kind: 'word' });
    } else if (DIGIT.test(ch)) {
      let n = '';
      while (i < chars.length && DIGIT.test(chars[i])) n += chars[i++];
      for (let p = 0; p < n.length; p += 3) out.push({ text: n.slice(p, p + 3), kind: 'num' });
    } else if (SPACE.test(ch)) {
      i++;
    } else {
      out.push({ text: ch, kind: 'punct' });
      i++;
    }
  }
  return out;
}

export function countChars(input: string): number {
  return Array.from(input).filter((c) => !SPACE.test(c)).length;
}

/** 教學用單價示意：每百萬 Token 輸入 US$ 3（假設值，不代表任何廠商報價） */
export const DEMO_PRICE_PER_MILLION = 3;
export function demoCost(tokens: number, calls = 1000): number {
  return (tokens * calls * DEMO_PRICE_PER_MILLION) / 1_000_000;
}
