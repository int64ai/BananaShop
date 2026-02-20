// ─── Layer System ──────────────────────────────────────────

export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerVersion {
  imageDataUrl: string;
  prompt: string;
  timestamp: number;
}

export interface LayerData {
  id: string;
  name: string;
  image: HTMLImageElement;
  originalWidth: number;
  originalHeight: number;
  transform: LayerTransform;
  opacity: number;
  visible: boolean;
  crop: CropRect | null;
  /** AI conversation history for this layer */
  aiHistory: AIMessage[];
  /** Version history for undo/redo per layer */
  versions: LayerVersion[];
  currentVersionIndex: number;
}

export type ActiveTool = 'select' | 'move' | 'hand';

export interface Viewport {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
}

export type HandleType =
  | 'tl' | 'tr' | 'bl' | 'br'
  | 'rotate';

export interface HandleInfo {
  type: HandleType;
  layerId: string;
}

export interface DragState {
  type: 'move' | 'scale' | 'rotate' | 'pan';
  layerId?: string;
  handle?: HandleType;
  startCanvasX: number;
  startCanvasY: number;
  startLayerX: number;
  startLayerY: number;
  startRotation: number;
  startScaleX: number;
  startScaleY: number;
  startViewport: Viewport;
}

// ─── AI (Nano Banana) ──────────────────────────────────────

export type NanoBananaModel =
  | 'gemini-2.5-flash-image'
  | 'gemini-3-pro-image-preview';

export interface AIMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageDataUrl?: string;
  timestamp: number;
}

