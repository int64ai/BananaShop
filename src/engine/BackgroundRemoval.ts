import type { ProgressCallback } from './types';

export type { ProgressCallback };

/**
 * Remove background from an image using @imgly/background-removal (runs in browser).
 */
export async function removeBackground(
  image: HTMLImageElement,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const { removeBackground: removeBg } = await import('@imgly/background-removal');

  // Convert HTMLImageElement → Blob
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const srcBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );

  const result = await removeBg(srcBlob, {
    progress: onProgress
      ? (key: string, current: number, total: number) => {
          onProgress(key, current, total);
        }
      : undefined,
  });

  return result;
}
