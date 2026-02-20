import type { LayerData, Viewport, CanvasConfig } from '../types';
import { applyTransformToContext, getCorners, getRotationHandlePos } from './Transform';

let checkerPattern: CanvasPattern | null = null;
let checkerPatternCanvas: HTMLCanvasElement | null = null;

function getCheckerPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  // Recreate if canvas context changed (e.g., canvas remount)
  if (checkerPattern && checkerPatternCanvas === ctx.canvas) return checkerPattern;
  const size = 16;
  const off = document.createElement('canvas');
  off.width = size * 2;
  off.height = size * 2;
  const oc = off.getContext('2d')!;
  oc.fillStyle = '#f3f4f6';
  oc.fillRect(0, 0, size * 2, size * 2);
  oc.fillStyle = '#d1d5db';
  oc.fillRect(0, 0, size, size);
  oc.fillRect(size, size, size, size);
  checkerPattern = ctx.createPattern(off, 'repeat')!;
  checkerPatternCanvas = ctx.canvas;
  return checkerPattern;
}

export function render(
  canvas: HTMLCanvasElement,
  layers: readonly LayerData[],
  selectedLayerId: string | null,
  viewport: Viewport,
  config: CanvasConfig,
): void {
  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;
  if (displayW === 0 || displayH === 0) return;

  // Only resize canvas buffer when dimensions actually change
  const targetW = Math.round(displayW * dpr);
  const targetH = Math.round(displayH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayW, displayH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.zoom, viewport.zoom);

  // Canvas background (checkerboard)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, config.width, config.height);
  ctx.clip();
  const pat = getCheckerPattern(ctx);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, config.width, config.height);
  ctx.restore();

  // Canvas border
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1 / viewport.zoom;
  ctx.strokeRect(0, 0, config.width, config.height);

  // Draw layers bottom to top
  drawLayers(ctx, layers);

  // Selection handles
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  if (selectedLayer) {
    drawSelectionHandles(ctx, selectedLayer, viewport.zoom);
  }

  ctx.restore();
}

/** Draw all visible layers onto a 2D context. */
function drawLayers(ctx: CanvasRenderingContext2D, layers: readonly LayerData[]): void {
  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    applyTransformToContext(ctx, layer.transform);
    const w = layer.crop?.width ?? layer.originalWidth;
    const h = layer.crop?.height ?? layer.originalHeight;
    const sx = layer.crop?.x ?? 0;
    const sy = layer.crop?.y ?? 0;
    ctx.drawImage(layer.image, sx, sy, w, h, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function drawSelectionHandles(ctx: CanvasRenderingContext2D, layer: LayerData, zoom: number): void {
  const corners = getCorners(layer);
  const pts = [corners.tl, corners.tr, corners.br, corners.bl];
  const lw = 1.5 / zoom;
  const handleSize = 6 / zoom;

  // Bounding box
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.stroke();

  // Corner handles
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5 / zoom;
  for (const [px, py] of pts) {
    ctx.fillRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
  }

  // Rotation handle
  const topMid: [number, number] = [
    (corners.tl[0] + corners.tr[0]) / 2,
    (corners.tl[1] + corners.tr[1]) / 2,
  ];
  const [rx, ry] = getRotationHandlePos(corners, zoom);

  // Stem line
  ctx.beginPath();
  ctx.moveTo(topMid[0], topMid[1]);
  ctx.lineTo(rx, ry);
  ctx.stroke();

  // Circle
  const r = 4 / zoom;
  ctx.beginPath();
  ctx.arc(rx, ry, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.stroke();
}

/** Render all visible layers to an offscreen canvas for export. */
export function renderExport(
  layers: readonly LayerData[],
  config: CanvasConfig,
  scale: number = 1,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = config.width * scale;
  c.height = config.height * scale;
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawLayers(ctx, layers);
  return c;
}
