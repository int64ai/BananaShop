import type { LayerData, CanvasConfig } from '../types';
import { renderExport } from './Renderer';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  scale: number;
}

export function exportToBlob(
  layers: readonly LayerData[],
  config: CanvasConfig,
  options: ExportOptions,
): Promise<Blob> {
  const canvas = renderExport(layers, config, options.scale);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export'))),
      `image/${options.format}`,
      options.quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert an HTMLImageElement to a data URL.
 * Large images are downscaled to maxDim to prevent OOM on canvas.toDataURL().
 */
export function imageToDataUrl(
  img: HTMLImageElement,
  format: string = 'image/png',
  maxDim: number = 4096,
): string {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL(format);
}
