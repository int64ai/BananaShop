import type { LayerData, HandleInfo } from '../types';
import { canvasToLocal, getCorners, getRotationHandlePos } from './Transform';

export function hitTestLayer(layer: LayerData, cx: number, cy: number): boolean {
  if (!layer.visible) return false;
  const [lx, ly] = canvasToLocal(cx, cy, layer.transform);
  const w = layer.crop?.width ?? layer.originalWidth;
  const h = layer.crop?.height ?? layer.originalHeight;
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}

/** Test layers top-to-bottom, return topmost hit. */
export function hitTestLayers(layers: readonly LayerData[], cx: number, cy: number): LayerData | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    if (hitTestLayer(layers[i], cx, cy)) return layers[i];
  }
  return null;
}

export function hitTestHandle(
  cx: number, cy: number,
  layer: LayerData,
  zoom: number,
): HandleInfo | null {
  const corners = getCorners(layer);
  const radius = 8 / zoom;

  const handles: Array<{ type: HandleInfo['type']; pos: [number, number] }> = [
    { type: 'tl', pos: corners.tl },
    { type: 'tr', pos: corners.tr },
    { type: 'bl', pos: corners.bl },
    { type: 'br', pos: corners.br },
  ];

  // Rotation handle: above top edge center
  handles.push({
    type: 'rotate',
    pos: getRotationHandlePos(corners, zoom),
  });

  for (const h of handles) {
    const dx = cx - h.pos[0];
    const dy = cy - h.pos[1];
    if (dx * dx + dy * dy <= radius * radius) {
      return { type: h.type, layerId: layer.id };
    }
  }
  return null;
}
