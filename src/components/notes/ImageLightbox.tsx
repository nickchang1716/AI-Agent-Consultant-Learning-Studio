import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="圖片放大檢視" onClick={onClose}>
      <button type="button" className="btn-ghost absolute right-3 top-3 !px-2" onClick={onClose} aria-label="關閉">
        <X size={18} />
      </button>
      <img src={src} alt="放大的截圖" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
