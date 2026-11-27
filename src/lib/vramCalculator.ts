export const MODEL_SIZES_B = [7, 8, 14, 32, 70, 405] as const;
export const CONTEXTS = [4096, 16384, 32768, 131072] as const;

export const PRECISIONS = {
  fp16: { label: 'FP16 (2 bytes)', bytes: 2 },
  int8: { label: 'FP8 / INT8 (1 byte)', bytes: 1 },
  int4: { label: 'INT4 / AWQ (0.55 bytes)', bytes: 0.55 },
} as const;
export type PrecisionKey = keyof typeof PRECISIONS;

export interface VramInput {
  paramsB: number;
  precision: PrecisionKey;
  contextLen: number;
  concurrency: number;
}

export interface VramResult {
  weightsGB: number;
  kvCacheGB: number;
  overheadGB: number;
  totalGB: number;
}

/** 教學用估算：KV Cache 以每 1B 參數每 Token 約 0.0000025 GB（約 2.5 KB/B-param，FP16 KV、GQA 近似）估算 */
const KV_GB_PER_B_PER_TOKEN = 0.0000025;
const OVERHEAD_RATIO = 0.175; // 15~20%

export function estimateVram(i: VramInput): VramResult {
  const weightsGB = i.paramsB * PRECISIONS[i.precision].bytes;
  const kvCacheGB = i.paramsB * KV_GB_PER_B_PER_TOKEN * i.contextLen * i.concurrency;
  const overheadGB = (weightsGB + kvCacheGB) * OVERHEAD_RATIO;
  const totalGB = weightsGB + kvCacheGB + overheadGB;
  return { weightsGB, kvCacheGB, overheadGB, totalGB };
}

export interface GpuOption {
  count: number;
  name: string;
  perGpuGB: number;
}

const GPUS: { name: string; gb: number }[] = [
  { name: 'L40S 48GB', gb: 48 },
  { name: 'A100 80GB', gb: 80 },
  { name: 'H100 80GB', gb: 80 },
];

/** 回傳最小可行組合；usable 預留 10% 餘裕 */
export function recommendGpu(totalGB: number): GpuOption {
  const need = totalGB / 0.9;
  for (const g of GPUS) {
    if (g.gb >= need) return { count: 1, name: g.name, perGpuGB: g.gb };
  }
  const h = GPUS[2];
  const count = Math.ceil(need / h.gb);
  return { count, name: h.name, perGpuGB: h.gb };
}

export function formatGpu(o: GpuOption): string {
  return `${o.count}x ${o.name}`;
}
