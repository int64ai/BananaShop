import type { LayerData, LayerTransform, Viewport } from '../types';

const DEG2RAD = Math.PI / 180;

export function degToRad(deg: number): number { return deg * DEG2RAD; }

export function getCorners(layer: LayerData): { tl: [number, number]; tr: [number, number]; bl: [number, number]; br: [number, number] } {
  const { x, y, scaleX, scaleY, rotation } = layer.transform;
  const w = (layer.crop?.width ?? layer.originalWidth) * scaleX;
  const h = (layer.crop?.height ?? layer.originalHeight) * scaleY;
  const hw = w / 2;
  const hh = h / 2;
  const cos = Math.cos(degToRad(rotation));
  const sin = Math.sin(degToRad(rotation));
  const corners: [number, number][] = [
    [-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh],
  ];
  return {
    tl: [x + corners[0][0] * cos - corners[0][1] * sin, y + corners[0][0] * sin + corners[0][1] * cos],
    tr: [x + corners[1][0] * cos - corners[1][1] * sin, y + corners[1][0] * sin + corners[1][1] * cos],
    bl: [x + corners[2][0] * cos - corners[2][1] * sin, y + corners[2][0] * sin + corners[2][1] * cos],
    br: [x + corners[3][0] * cos - corners[3][1] * sin, y + corners[3][0] * sin + corners[3][1] * cos],
  };
}

export function screenToCanvas(sx: number, sy: number, viewport: Viewport): [number, number] {
  return [(sx - viewport.offsetX) / viewport.zoom, (sy - viewport.offsetY) / viewport.zoom];
}

export function canvasToLocal(cx: number, cy: number, t: LayerTransform): [number, number] {
  const dx = cx - t.x;
  const dy = cy - t.y;
  const cos = Math.cos(degToRad(-t.rotation));
  const sin = Math.sin(degToRad(-t.rotation));
  return [(dx * cos - dy * sin) / t.scaleX, (dx * sin + dy * cos) / t.scaleY];
}

export function applyTransformToContext(ctx: CanvasRenderingContext2D, t: LayerTransform): void {
  ctx.translate(t.x, t.y);
  ctx.rotate(degToRad(t.rotation));
  ctx.scale(t.scaleX, t.scaleY);
}

/** Compute the rotation handle position above the top edge midpoint. */
export function getRotationHandlePos(
  corners: ReturnType<typeof getCorners>,
  zoom: number,
): [number, number] {
  const topMidX = (corners.tl[0] + corners.tr[0]) / 2;
  const topMidY = (corners.tl[1] + corners.tr[1]) / 2;
  const topEdgeDx = corners.tr[0] - corners.tl[0];
  const topEdgeDy = corners.tr[1] - corners.tl[1];
  const outAngle = Math.atan2(-topEdgeDx, topEdgeDy);
  const rotDist = 25 / zoom;
  return [topMidX + Math.cos(outAngle) * rotDist, topMidY + Math.sin(outAngle) * rotDist];
}
