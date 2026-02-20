import { v4 as uuidv4 } from 'uuid';
import type { LayerData, CanvasConfig } from '../types';

/** Create a LayerData from an HTMLImageElement, centered and fit to canvas. */
export function createLayerFromImage(
  img: HTMLImageElement,
  name: string,
  config: CanvasConfig,
): LayerData {
  const scale = Math.min(
    config.width / img.naturalWidth,
    config.height / img.naturalHeight,
    1,
  );
  return {
    id: uuidv4(),
    name,
    image: img,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    transform: {
      x: config.width / 2,
      y: config.height / 2,
      scaleX: scale,
      scaleY: scale,
      rotation: 0,
    },
    opacity: 1,
    visible: true,
    crop: null,
    aiHistory: [],
    versions: [],
    currentVersionIndex: -1,
  };
}
