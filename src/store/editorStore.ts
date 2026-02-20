import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  LayerData,
  LayerTransform,
  CanvasConfig,
  Viewport,
  ActiveTool,
  CropRect,
  NanoBananaModel,
  AIMessage,
} from '../types';

// ─── History ──────────────────────────────────────────────

interface HistoryEntry {
  layers: LayerData[];
  selectedLayerId: string | null;
}

/** Deep-clone the current visual state for undo/redo snapshots. */
function createSnapshot(layers: LayerData[], selectedLayerId: string | null): HistoryEntry {
  return {
    layers: layers.map((l) => ({
      ...l,
      transform: { ...l.transform },
      aiHistory: [...l.aiHistory],
      versions: [...l.versions],
      crop: l.crop ? { ...l.crop } : null,
    })),
    selectedLayerId,
  };
}

// ─── Store ────────────────────────────────────────────────

interface EditorState {
  // Canvas
  canvasConfig: CanvasConfig;
  setCanvasConfig: (c: CanvasConfig) => void;

  // Viewport
  viewport: Viewport;
  setViewport: (v: Partial<Viewport>) => void;

  // Tool
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;

  // Layers
  layers: LayerData[];
  selectedLayerId: string | null;

  addLayer: (layer: LayerData) => void;
  removeLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  updateLayerTransform: (id: string, t: Partial<LayerTransform>) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  toggleVisibility: (id: string) => void;
  reorderLayers: (from: number, to: number) => void;
  renameLayer: (id: string, name: string) => void;
  setLayerCrop: (id: string, crop: CropRect | null) => void;
  replaceLayerImage: (id: string, image: HTMLImageElement, w: number, h: number) => void;

  /** Replace layer image without pushing to undo history (for operations that already pushed). */
  replaceLayerImageNoHistory: (id: string, image: HTMLImageElement, w: number, h: number) => void;

  /** Save a version snapshot for a layer (for AI edits). */
  pushLayerVersion: (id: string, imageDataUrl: string, prompt: string) => void;
  // AI
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: NanoBananaModel;
  setSelectedModel: (m: NanoBananaModel) => void;
  aiLoading: boolean;
  setAiLoading: (v: boolean) => void;
  addAiMessage: (layerId: string, msg: AIMessage) => void;

  // Background removal
  bgRemovalProgress: number;
  setBgRemovalProgress: (v: number) => void;

  // Export
  exportDialogOpen: boolean;
  setExportDialogOpen: (v: boolean) => void;

  // Settings
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  // Toast
  toastMessage: string | null;
  setToast: (msg: string | null) => void;

  // Shortcuts dialog
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;

  // Duplicate
  duplicateLayer: (id: string) => void;

  // Global undo/redo
  _history: HistoryEntry[];
  _future: HistoryEntry[];
  _pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Canvas
  canvasConfig: { width: 1280, height: 720 },
  setCanvasConfig: (c) => set({ canvasConfig: c }),

  // Viewport
  viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
  setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),

  // Tool
  activeTool: 'select',
  setActiveTool: (t) => set({ activeTool: t }),

  // Layers
  layers: [],
  selectedLayerId: null,

  addLayer: (layer) => {
    get()._pushHistory();
    set((s) => ({ layers: [...s.layers, layer], selectedLayerId: layer.id }));
  },

  removeLayer: (id) => {
    get()._pushHistory();
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
    }));
  },

  selectLayer: (id) => set({ selectedLayerId: id }),

  updateLayerTransform: (id, t) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, transform: { ...l.transform, ...t } } : l,
      ),
    })),

  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l,
      ),
    })),

  toggleVisibility: (id) => {
    get()._pushHistory();
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  },

  reorderLayers: (from, to) => {
    get()._pushHistory();
    set((s) => {
      const arr = [...s.layers];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { layers: arr };
    });
  },

  renameLayer: (id, name) => {
    get()._pushHistory();
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)),
    }));
  },

  setLayerCrop: (id, crop) => {
    get()._pushHistory();
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, crop } : l)),
    }));
  },

  replaceLayerImage: (id, image, w, h) => {
    get()._pushHistory();
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, image, originalWidth: w, originalHeight: h, crop: null } : l,
      ),
    }));
  },

  replaceLayerImageNoHistory: (id, image, w, h) => {
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, image, originalWidth: w, originalHeight: h, crop: null } : l,
      ),
    }));
  },

  pushLayerVersion: (id, imageDataUrl, prompt) =>
    set((s) => ({
      layers: s.layers.map((l) => {
        if (l.id !== id) return l;
        const newVersions = [
          ...l.versions.slice(0, l.currentVersionIndex + 1),
          { imageDataUrl, prompt, timestamp: Date.now() },
        ];
        // Cap at 20 versions to prevent memory bloat from accumulated base64 data
        const maxVersions = 20;
        const trimmed = newVersions.length > maxVersions ? newVersions.slice(-maxVersions) : newVersions;
        return { ...l, versions: trimmed, currentVersionIndex: trimmed.length - 1 };
      }),
    })),

  // AI
  apiKey: localStorage.getItem('banana-api-key') ?? '',
  setApiKey: (key) => {
    localStorage.setItem('banana-api-key', key);
    set({ apiKey: key });
  },
  selectedModel: 'gemini-2.5-flash-image',
  setSelectedModel: (m) => set({ selectedModel: m }),
  aiLoading: false,
  setAiLoading: (v) => set({ aiLoading: v }),
  addAiMessage: (layerId, msg) =>
    set((s) => ({
      layers: s.layers.map((l) => {
        if (l.id !== layerId) return l;
        const newHistory = [...l.aiHistory, msg];
        // Strip imageDataUrl from older model messages to prevent memory bloat.
        // Keep images only for the last 10 messages.
        const maxWithImages = 10;
        if (newHistory.length > maxWithImages) {
          const cutoff = newHistory.length - maxWithImages;
          for (let i = 0; i < cutoff; i++) {
            if (newHistory[i].imageDataUrl) {
              newHistory[i] = { ...newHistory[i], imageDataUrl: undefined };
            }
          }
        }
        return { ...l, aiHistory: newHistory };
      }),
    })),

  // Background removal
  bgRemovalProgress: -1,
  setBgRemovalProgress: (v) => set({ bgRemovalProgress: v }),

  // Export
  exportDialogOpen: false,
  setExportDialogOpen: (v) => set({ exportDialogOpen: v }),

  // Settings
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  // Global error/toast
  toastMessage: null as string | null,
  setToast: (msg: string | null) => set({ toastMessage: msg }),

  // Shortcuts dialog
  shortcutsOpen: false,
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),

  // Duplicate layer — deep copy all nested objects
  duplicateLayer: (id: string) => {
    const { layers } = get();
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    get()._pushHistory();
    const dup: LayerData = {
      ...layer,
      id: uuidv4(),
      name: `${layer.name} (copy)`,
      transform: { ...layer.transform, x: layer.transform.x + 20, y: layer.transform.y + 20 },
      aiHistory: layer.aiHistory.map((m) => ({ ...m })),
      versions: layer.versions.map((v) => ({ ...v })),
      crop: layer.crop ? { ...layer.crop } : null,
    };
    set((s) => ({ layers: [...s.layers, dup], selectedLayerId: dup.id }));
  },

  // Undo/Redo
  // Note on undo conventions: actions that represent discrete user operations (addLayer, removeLayer,
  // toggleVisibility, reorderLayers, setLayerCrop, replaceLayerImage) call _pushHistory internally.
  // Continuous operations (updateLayerTransform, setLayerOpacity) do NOT push history —
  // callers must push before the first change in a drag/interaction session.
  _history: [],
  _future: [],
  _pushHistory: () => {
    const { layers, selectedLayerId, _history } = get();
    set({ _history: [..._history.slice(-49), createSnapshot(layers, selectedLayerId)], _future: [] });
  },
  undo: () => {
    const { _history, layers, selectedLayerId } = get();
    if (_history.length === 0) return;
    const prev = _history[_history.length - 1];
    set({
      _history: _history.slice(0, -1),
      _future: [...get()._future, createSnapshot(layers, selectedLayerId)],
      layers: prev.layers,
      selectedLayerId: prev.selectedLayerId,
    });
  },
  redo: () => {
    const { _future, layers, selectedLayerId } = get();
    if (_future.length === 0) return;
    const next = _future[_future.length - 1];
    set({
      _future: _future.slice(0, -1),
      _history: [...get()._history, createSnapshot(layers, selectedLayerId)],
      layers: next.layers,
      selectedLayerId: next.selectedLayerId,
    });
  },
}));
