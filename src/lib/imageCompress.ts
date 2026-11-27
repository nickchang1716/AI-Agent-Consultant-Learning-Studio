const MAX_WIDTH = 1600;
const MAX_BYTES = 1.5 * 1024 * 1024;

/** 以 Canvas 壓縮：寬度上限 1600px、WebP 0.82；超過 1.5MB 則逐步降低品質 */
export async function compressImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法建立繪圖環境');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  let q = 0.82;
  for (;;) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', q));
    if (!blob) throw new Error('圖片壓縮失敗');
    if (blob.size <= MAX_BYTES || q <= 0.4) return blob;
    q -= 0.1;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('讀取圖片失敗'));
    r.readAsDataURL(blob);
  });
}
