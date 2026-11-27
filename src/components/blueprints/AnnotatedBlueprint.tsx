import { useState, type ReactNode } from 'react';
import type { BlueprintData } from '../../types/learning';

interface Props {
  data: BlueprintData;
  /** SVG 底圖，需使用 viewBox="0 0 800 450" */
  children: ReactNode;
}

/** 在底圖座標 (x%, y%) 放置編號圓點；點擊於下方顯示用途與顧問實務重點 */
export default function AnnotatedBlueprint({ data, children }: Props) {
  const [sel, setSel] = useState(1);
  const h = data.hotspots.find((x) => x.id === sel) ?? data.hotspots[0];

  return (
    <figure className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-600" style={{ aspectRatio: '16 / 9' }}>
        <div className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`${data.title}示意圖（教學用結構化示意，非實際截圖）`}>
          {children}
        </div>
        {data.hotspots.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSel(p.id)}
            aria-label={`熱點 ${p.id}：${p.title}`}
            aria-pressed={p.id === sel}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow-md transition ${
              p.id === sel ? 'scale-110 border-white bg-red-600 text-white ring-2 ring-red-300' : 'border-white bg-teal text-white hover:bg-teal-dark'
            }`}
          >
            {p.id}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="熱點清單">
        {data.hotspots.map((p) => (
          <button key={p.id} type="button" onClick={() => setSel(p.id)} className={`btn !min-h-[44px] border text-xs ${p.id === sel ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
            {p.id}. {p.title}
          </button>
        ))}
      </div>
      <figcaption className="card space-y-1 text-sm" aria-live="polite">
        <h4 className="font-bold">{h.id}. {h.title}</h4>
        <p>{h.description}</p>
        <p className="text-teal-dark dark:text-teal-100">{h.tip}</p>
        <p className="text-xs text-slate-500">此圖為教學用結構化示意，實際介面依平台版本而異。</p>
      </figcaption>
    </figure>
  );
}
