import { useMemo, useState } from 'react';
import { CONTEXTS, MODEL_SIZES_B, PRECISIONS, estimateVram, formatGpu, recommendGpu, type PrecisionKey } from '../../lib/vramCalculator';

const fmtCtx = (n: number) => `${Math.round(n / 1024)}K`;

export default function Simulator2() {
  const [paramsB, setParamsB] = useState<number>(7);
  const [precision, setPrecision] = useState<PrecisionKey>('fp16');
  const [contextLen, setContextLen] = useState<number>(16384);
  const [concurrency, setConcurrency] = useState(8);

  const r = useMemo(() => estimateVram({ paramsB, precision, contextLen, concurrency }), [paramsB, precision, contextLen, concurrency]);
  const gpu = recommendGpu(r.totalGB);
  const pct = (v: number) => `${(v / r.totalGB) * 100}%`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          模型參數量
          <select className="input mt-1" value={paramsB} onChange={(e) => setParamsB(Number(e.target.value))}>
            {MODEL_SIZES_B.map((s) => <option key={s} value={s}>{s}B</option>)}
          </select>
        </label>
        <label className="block text-sm">
          權重精度／量化
          <select className="input mt-1" value={precision} onChange={(e) => setPrecision(e.target.value as PrecisionKey)}>
            {(Object.keys(PRECISIONS) as PrecisionKey[]).map((k) => <option key={k} value={k}>{PRECISIONS[k].label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          上下文長度 Context Length
          <select className="input mt-1" value={contextLen} onChange={(e) => setContextLen(Number(e.target.value))}>
            {CONTEXTS.map((c) => <option key={c} value={c}>{fmtCtx(c)}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          同時併發數 Concurrency：<strong>{concurrency}</strong>
          <input type="range" min={1} max={64} value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} className="mt-2 h-11 w-full accent-teal" aria-label="併發數" />
        </label>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">預估總 VRAM：<span className="text-xl text-teal">{r.totalGB.toFixed(1)} GB</span></p>
        <div className="flex h-9 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600" role="img" aria-label={`權重 ${r.weightsGB.toFixed(1)} GB、KV Cache ${r.kvCacheGB.toFixed(1)} GB、Overhead ${r.overheadGB.toFixed(1)} GB`}>
          <div className="bg-navy" style={{ width: pct(r.weightsGB) }} title="模型權重" />
          <div className="bg-teal" style={{ width: pct(r.kvCacheGB) }} title="KV Cache" />
          <div className="bg-amber-400" style={{ width: pct(r.overheadGB) }} title="框架 Overhead" />
        </div>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
          <li><span className="mr-1 inline-block h-3 w-3 rounded bg-navy align-middle" />模型權重：<strong>{r.weightsGB.toFixed(1)} GB</strong></li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded bg-teal align-middle" />KV Cache：<strong>{r.kvCacheGB.toFixed(1)} GB</strong></li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded bg-amber-400 align-middle" />框架 Overhead（約 15~20%）：<strong>{r.overheadGB.toFixed(1)} GB</strong></li>
        </ul>
      </div>

      <div className="card text-sm">
        <p>建議 GPU 組合：<strong className="text-teal">{formatGpu(gpu)}</strong>（已預留約 10% 餘裕）</p>
        {gpu.count > 8 && <p className="mt-1 text-red-600">需求已超過單一伺服器常見的 8 卡配置，需跨節點部署，請與架構師確認。</p>}
      </div>

      <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
        為何 7B 模型不是只要 7GB VRAM？權重大小取決於精度（FP16 約 14GB），再加上隨上下文長度與併發線性成長的 KV Cache，以及推論框架的 overhead。
      </p>
      <p className="text-xs text-slate-500">
        ※ 架構初步估算模型（教學示意）。實際用量依模型架構（GQA/MQA）、KV Cache 精度、batching 策略與推論框架而異；量化主要降低權重，不一定降低 KV Cache。正式 sizing 請以實測為準。
      </p>
    </div>
  );
}
