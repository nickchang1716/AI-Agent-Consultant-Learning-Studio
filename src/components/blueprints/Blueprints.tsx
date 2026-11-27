import { blueprints } from '../../data/blueprints';
import type { BlueprintId } from '../../types/learning';
import AnnotatedBlueprint from './AnnotatedBlueprint';

const BG = '#f8fafc';
const LINE = '#94a3b8';
const NAVY = '#142a40';
const TEAL = '#087e83';

function Box({ x, y, w, h, label, fill = '#fff', stroke = LINE, color = NAVY, size = 13 }: { x: number; y: number; w: number; h: number; label: string; fill?: string; stroke?: string; color?: string; size?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} />
      <text x={x + w / 2} y={y + h / 2 + size / 3} textAnchor="middle" fontSize={size} fill={color} fontFamily="system-ui, sans-serif">{label}</text>
    </g>
  );
}

function AzureMlSvg() {
  return (
    <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill={BG} />
      <rect width="800" height="44" fill={NAVY} />
      <text x="16" y="28" fontSize="15" fill="#fff" fontFamily="system-ui, sans-serif">Azure Machine Learning studio — Workspace</text>
      <rect y="44" width="170" height="406" fill="#eef2f7" stroke={LINE} />
      {['Home', 'Compute', 'Data', 'Jobs', 'Models', 'Endpoints'].map((t, i) => (
        <text key={t} x="22" y={92 + i * 40} fontSize="14" fill={NAVY} fontFamily="system-ui, sans-serif">{t}</text>
      ))}
      <Box x={200} y={64} w={260} h={150} label="Jobs / Experiments（MLflow 指標曲線）" />
      <polyline points="220,190 280,170 340,160 400,140 440,132" fill="none" stroke={TEAL} strokeWidth="3" />
      <Box x={490} y={64} w={290} h={150} label="Compute：cluster / instance 狀態" />
      <Box x={200} y={240} w={260} h={124} label="Model Registry：版本列表" />
      <Box x={490} y={240} w={290} h={124} label="Online Endpoints：流量與延遲" />
      <Box x={200} y={376} w={580} h={60} label="Data assets / Datastore" size={13} fill="#eef2f7" />
    </svg>
  );
}

function FoundrySvg() {
  return (
    <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill={BG} />
      <rect width="800" height="44" fill={NAVY} />
      <text x="16" y="28" fontSize="15" fill="#fff" fontFamily="system-ui, sans-serif">Microsoft Foundry — Playground</text>
      <Box x={16} y={60} w={200} h={110} label="Deployment：gpt-xx（選單）" />
      <Box x={16} y={186} w={200} h={200} label="System instructions" />
      <rect x={232} y={60} width={360} height={326} rx={8} fill="#fff" stroke={LINE} />
      <text x="248" y="86" fontSize="13" fill={NAVY} fontFamily="system-ui, sans-serif">對話區（Chat）</text>
      <rect x={248} y={100} width={220} height={36} rx={10} fill="#e2e8f0" />
      <rect x={364} y={150} width={212} height={48} rx={10} fill={TEAL} />
      <rect x={248} y={214} width={260} height={48} rx={10} fill="#e2e8f0" />
      <Box x={248} y={340} w={328} h={34} label="輸入訊息…" fill="#f1f5f9" size={12} />
      <Box x={608} y={60} w={176} h={110} label="Temperature / Max tokens" size={12} />
      <Box x={608} y={186} w={176} h={110} label="Tools / Knowledge（RAG）" size={12} />
      <Box x={608} y={312} w={176} h={74} label="</> Code export" size={12} />
      <rect x={16} y={398} width={768} height={40} rx={8} fill="#eef2f7" stroke={LINE} />
      <text x="400" y="423" textAnchor="middle" fontSize="12" fill="#475569" fontFamily="system-ui, sans-serif">Playground 僅供測試，正式整合請以 SDK / REST 並加上驗證與監控</text>
    </svg>
  );
}

function LangSmithSvg() {
  return (
    <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill={BG} />
      <rect width="800" height="44" fill={NAVY} />
      <text x="16" y="28" fontSize="15" fill="#fff" fontFamily="system-ui, sans-serif">LangSmith — Trace</text>
      <rect x={16} y={60} width={220} height={376} rx={8} fill="#fff" stroke={LINE} />
      <text x="30" y="84" fontSize="13" fill={NAVY} fontFamily="system-ui, sans-serif">Run tree</text>
      {['Agent', '├ retriever', '├ llm', '├ tool: get_customer', '└ llm (final)'].map((t, i) => (
        <text key={t} x={30 + (i === 0 ? 0 : 10)} y={116 + i * 30} fontSize="13" fill="#334155" fontFamily="ui-monospace, monospace">{t}</text>
      ))}
      <Box x={252} y={60} w={340} h={56} label="Latency 3.2s ｜ Tokens 1,840 ｜ $0.012" size={13} />
      <Box x={252} y={130} w={340} h={130} label="Retriever：Top-K 文件片段與分數" size={13} />
      <Box x={252} y={274} w={340} h={162} label="Tool call：input / output JSON" size={13} />
      <Box x={608} y={60} w={176} h={376} label="Feedback / Eval score" size={13} />
      <rect x={624} y={110} width={144} height={14} rx={7} fill="#e2e8f0" />
      <rect x={624} y={110} width={118} height={14} rx={7} fill={TEAL} />
      <rect x={624} y={150} width={144} height={14} rx={7} fill="#e2e8f0" />
      <rect x={624} y={150} width={80} height={14} rx={7} fill="#dc2626" />
    </svg>
  );
}

const svgs: Record<BlueprintId, () => JSX.Element> = { azureml: AzureMlSvg, foundry: FoundrySvg, langsmith: LangSmithSvg };

export default function PlatformBlueprint({ id }: { id: BlueprintId }) {
  const data = blueprints.find((b) => b.id === id);
  if (!data) return null;
  const Svg = svgs[id];
  return (
    <AnnotatedBlueprint data={data}>
      <Svg />
    </AnnotatedBlueprint>
  );
}
