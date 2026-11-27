export type Role = '一般理專' | '分行主管';

export interface CorpusDoc {
  id: string;
  title: string;
  acl: Role;
  status: 'active' | 'expired';
  statusLabel: string;
  text: string;
}

export const CORPUS: CorpusDoc[] = [
  {
    id: 'A',
    title: '2026 高收益債券基金銷售規範 v2.1',
    acl: '一般理專',
    status: 'active',
    statusLabel: '現行有效',
    text:
      '高收益債券基金屬於中高風險商品，僅得銷售予風險承受度為 RR3 以上之客戶。高收益債券基金申購門檻為單筆最低新臺幣十萬元，定期定額每月最低新臺幣五千元。' +
      '銷售前理專須完成商品風險揭露並取得客戶簽署之風險預告書，且須確認客戶了解本商品可能發生本金損失。' +
      '若客戶年齡超過六十五歲，須由分行主管加簽並以錄音錄影方式確認其理解。' +
      '理專不得以過去績效作為未來報酬之保證，亦不得使用保證獲利等字眼。',
  },
  {
    id: 'B',
    title: '私人銀行大戶手續費減免內部底價表',
    acl: '分行主管',
    status: 'active',
    statusLabel: '現行有效（限主管）',
    text:
      '本表為內部機密文件，僅限分行主管查閱。私人銀行大戶手續費減免底價：資產達三千萬元以上客戶，基金申購手續費最低可減免至百分之零點五。' +
      '資產達一億元以上客戶，手續費減免底價為百分之零點三，並須由區域主管核准。' +
      '手續費減免底價不得對客戶揭露，理專僅得於核准範圍內提出優惠方案。',
  },
  {
    id: 'C',
    title: '2024 舊版外幣定存專案（已停售）',
    acl: '一般理專',
    status: 'expired',
    statusLabel: '已過期（已停售）',
    text:
      '本專案為二〇二四年外幣定存優惠，美元一年期定存專案利率為年息百分之五點二，最低承作金額為一萬美元。' +
      '本專案已於二〇二四年底停止銷售，所有條件僅供歷史參考，不得再向客戶推薦。',
  },
];

export interface Chunk {
  docId: string;
  index: number;
  start: number;
  end: number;
  text: string;
}

/** 以字元為單位切片；overlap 必須小於 size，否則視為 size - 1 */
export function chunkText(docId: string, text: string, size: number, overlap: number): Chunk[] {
  const sz = Math.max(1, Math.floor(size));
  const ov = Math.min(Math.max(0, Math.floor(overlap)), sz - 1);
  const step = sz - ov;
  const out: Chunk[] = [];
  for (let start = 0, i = 0; start < text.length; start += step, i++) {
    const end = Math.min(text.length, start + sz);
    out.push({ docId, index: i, start, end, text: text.slice(start, end) });
    if (end >= text.length) break;
  }
  return out;
}

function bigrams(s: string): Map<string, number> {
  const clean = s.replace(/[\s，。、；：？！（）()「」『』,.\-:;?!]/g, '');
  const m = new Map<string, number>();
  for (let i = 0; i < clean.length - 1; i++) {
    const g = clean.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Dice 係數（字元 bigram）；教學用的簡化相似度，非真實 embedding */
export function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  let sa = 0;
  let sb = 0;
  let inter = 0;
  A.forEach((v) => (sa += v));
  B.forEach((v) => (sb += v));
  if (sa === 0 || sb === 0) return 0;
  A.forEach((v, k) => {
    const o = B.get(k);
    if (o) inter += Math.min(v, o);
  });
  return (2 * inter) / (sa + sb);
}

export type ChunkVerdict = 'passed' | 'acl_blocked' | 'expired_blocked' | 'below_threshold' | 'not_topk';

export interface ScoredChunk extends Chunk {
  score: number;
  verdict: ChunkVerdict;
}

export interface RetrieveResult {
  scored: ScoredChunk[];
  context: ScoredChunk[];
  answerable: boolean;
}

export const SCORE_THRESHOLD = 0.08;

/**
 * 流程：全部切片計分 → 依分數排序取候選 → 權限過濾（ACL）→ 版本過期過濾 → 取 Top-K → 門檻判斷。
 * 被攔截的切片會標示原因，供模擬器呈現「相似度高但被擋下」。
 */
export function retrieve(query: string, role: Role, topK: number, size: number, overlap: number, corpus: CorpusDoc[] = CORPUS): RetrieveResult {
  const all: ScoredChunk[] = [];
  for (const d of corpus) {
    for (const c of chunkText(d.id, d.text, size, overlap)) {
      all.push({ ...c, score: similarity(query, c.text), verdict: 'not_topk' });
    }
  }
  all.sort((a, b) => b.score - a.score);

  const docOf = (id: string) => corpus.find((d) => d.id === id) as CorpusDoc;
  let taken = 0;
  for (const c of all) {
    const d = docOf(c.docId);
    if (c.score < SCORE_THRESHOLD) {
      c.verdict = 'below_threshold';
    } else if (d.acl === '分行主管' && role !== '分行主管') {
      c.verdict = 'acl_blocked';
    } else if (d.status === 'expired') {
      c.verdict = 'expired_blocked';
    } else if (taken < topK) {
      c.verdict = 'passed';
      taken++;
    } else {
      c.verdict = 'not_topk';
    }
  }
  const context = all.filter((c) => c.verdict === 'passed');
  return { scored: all, context, answerable: context.length > 0 };
}

export const PRESET_QUESTIONS = [
  { id: 'answer', label: '① 有答案題', text: '高收益債券基金的申購門檻是多少？' },
  { id: 'unauthorized', label: '② 越權題', text: '私人銀行大戶手續費減免底價是多少？' },
  { id: 'noanswer', label: '③ 無答案題', text: '加密貨幣現貨 ETF 可以推薦給客戶嗎？' },
] as const;
