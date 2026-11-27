import { blobToDataUrl } from '../../lib/imageCompress';
import { uuid } from '../../lib/id';

const DB_NAME = 'acs-images';
const STORE = 'images';
export const LOCAL_IMG_PREFIX = 'local-img://';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('此瀏覽器不支援 IndexedDB，無法在訪客模式儲存圖片。'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 開啟失敗'));
  });
}

export async function putLocalImage(blob: Blob): Promise<string> {
  const id = uuid();
  const dataUrl = await blobToDataUrl(blob);
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('圖片寫入失敗（可能是本機儲存空間不足）'));
    tx.onabort = () => reject(tx.error ?? new Error('圖片寫入失敗（可能是本機儲存空間不足）'));
  });
  db.close();
  return `${LOCAL_IMG_PREFIX}${id}`;
}

export async function getLocalImage(src: string): Promise<string | null> {
  if (!src.startsWith(LOCAL_IMG_PREFIX)) return null;
  const id = src.slice(LOCAL_IMG_PREFIX.length);
  try {
    const db = await open();
    const val = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return typeof val === 'string' && val.startsWith('data:image/') ? val : null;
  } catch {
    return null;
  }
}
