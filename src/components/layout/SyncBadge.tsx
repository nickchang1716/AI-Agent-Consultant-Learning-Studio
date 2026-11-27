import { AlertTriangle, Cloud, HardDrive, Loader2 } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';

export default function SyncBadge({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { status, retry, syncError } = useLearning();
  const base = 'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-medium';

  if (status === 'syncing') {
    return (
      <span className={`${base} bg-amber-100 text-amber-800`} role="status">
        <Loader2 size={14} className="animate-spin" aria-hidden /> 同步中...
      </span>
    );
  }
  if (status === 'synced') {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800`} role="status">
        <Cloud size={14} aria-hidden /> 雲端已同步 ✓
      </span>
    );
  }
  if (status === 'error') {
    return (
      <button type="button" onClick={retry} title={syncError ?? undefined} className={`${base} bg-red-100 text-red-800`}>
        <AlertTriangle size={14} aria-hidden /> 同步失敗（點擊重試）
      </button>
    );
  }
  return (
    <button type="button" onClick={onOpenAuth} className={`${base} bg-slate-200 text-slate-700 hover:bg-slate-300`}>
      <HardDrive size={14} aria-hidden /> 本機訪客模式
    </button>
  );
}
