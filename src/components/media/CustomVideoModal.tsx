import { useState } from 'react';
import { X } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';

interface Props {
  moduleId: number;
  /** 非 null：替換該筆內建清單項目；null：新增補充影片 */
  replacesIndex: number | null;
  defaultTitle?: string;
  onClose: () => void;
}

export default function CustomVideoModal({ moduleId, replacesIndex, defaultTitle = '', onClose }: Props) {
  const { saveCustomVideo } = useLearning();
  const [title, setTitle] = useState(defaultTitle.replace(/（搜尋入口）/g, ''));
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={replacesIndex === null ? '新增補充影片' : '替換為精選影片'}>
      <form
        className="card max-h-[90vh] w-full space-y-3 overflow-y-auto rounded-b-none sm:max-w-md sm:rounded-b-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const r = saveCustomVideo(moduleId, title, url, replacesIndex);
          if (r) setErr(r);
          else onClose();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{replacesIndex === null ? '新增補充影片' : '替換為精選影片'}</h2>
          <button type="button" className="btn-ghost !px-2" onClick={onClose} aria-label="關閉">
            <X size={18} />
          </button>
        </div>
        <label className="block text-sm">
          標題
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </label>
        <label className="block text-sm">
          網址（YouTube 或教學頁，https:// 或 http://）
          <input className="input mt-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." inputMode="url" required />
        </label>
        {err && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="btn-primary">儲存</button>
        </div>
      </form>
    </div>
  );
}
