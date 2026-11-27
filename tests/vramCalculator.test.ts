import { describe, expect, it } from 'vitest';
import { estimateVram, formatGpu, recommendGpu } from '../src/lib/vramCalculator';

describe('vramCalculator', () => {
  it('7B FP16 權重 = 14GB，且總量大於權重（7B 不是只要 7GB）', () => {
    const r = estimateVram({ paramsB: 7, precision: 'fp16', contextLen: 4096, concurrency: 1 });
    expect(r.weightsGB).toBe(14);
    expect(r.totalGB).toBeGreaterThan(14);
  });

  it('INT4 權重 = 0.55 bytes/param', () => {
    expect(estimateVram({ paramsB: 70, precision: 'int4', contextLen: 4096, concurrency: 1 }).weightsGB).toBeCloseTo(38.5);
  });

  it('KV Cache 隨 context 與併發線性成長，權重不變', () => {
    const a = estimateVram({ paramsB: 8, precision: 'fp16', contextLen: 4096, concurrency: 1 });
    const b = estimateVram({ paramsB: 8, precision: 'fp16', contextLen: 8192, concurrency: 4 });
    expect(b.kvCacheGB).toBeCloseTo(a.kvCacheGB * 8);
    expect(b.weightsGB).toBe(a.weightsGB);
  });

  it('overhead 約 15~20%', () => {
    const r = estimateVram({ paramsB: 14, precision: 'int8', contextLen: 16384, concurrency: 8 });
    const ratio = r.overheadGB / (r.weightsGB + r.kvCacheGB);
    expect(ratio).toBeGreaterThanOrEqual(0.15);
    expect(ratio).toBeLessThanOrEqual(0.2);
  });

  it('GPU 推薦：小模型單卡、大模型多卡', () => {
    expect(formatGpu(recommendGpu(15))).toBe('1x L4 24GB');
    expect(formatGpu(recommendGpu(21))).toBe('1x L4 24GB'); // 21/0.9 = 23.3 ≤ 24
    expect(formatGpu(recommendGpu(30))).toBe('1x L40S 48GB');
    expect(formatGpu(recommendGpu(300))).toMatch(/^\d+x H100 80GB$/);
    expect(formatGpu(recommendGpu(60))).toBe('1x A100 80GB');
    expect(recommendGpu(300).count).toBeGreaterThanOrEqual(4);
  });
});
