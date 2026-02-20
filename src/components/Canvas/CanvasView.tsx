import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { render } from '../../engine/Renderer';
import { useCanvasInteraction } from './useCanvasInteraction';
import { ImageIcon } from '../../icons';

const CURSOR_MAP: Record<string, string> = {
  select: 'default',
  move: 'move',
  hand: 'grab',
};

export default function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const layers = useEditorStore((s) => s.layers);
  const activeTool = useEditorStore((s) => s.activeTool);

  // Canvas interaction (mouse events)
  useCanvasInteraction(canvasRef);

  // Render loop — dirty-flag approach, only triggers on visual state changes
  useEffect(() => {
    let rafId = 0;
    let dirty = true;

    // Track previous visual state references to avoid unnecessary renders
    let prevLayers = useEditorStore.getState().layers;
    let prevSelectedId = useEditorStore.getState().selectedLayerId;
    let prevViewport = useEditorStore.getState().viewport;
    let prevConfig = useEditorStore.getState().canvasConfig;

    const scheduleRender = () => {
      if (!dirty) { dirty = true; }
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (dirty) {
            dirty = false;
            const canvas = canvasRef.current;
            if (canvas) {
              const { layers, selectedLayerId, viewport, canvasConfig } = useEditorStore.getState();
              render(canvas, layers, selectedLayerId, viewport, canvasConfig);
            }
          }
        });
      }
    };

    // Initial render
    scheduleRender();

    // Only schedule re-render when render-relevant state changes
    const unsub = useEditorStore.subscribe(() => {
      const { layers, selectedLayerId, viewport, canvasConfig } = useEditorStore.getState();
      if (
        layers !== prevLayers ||
        selectedLayerId !== prevSelectedId ||
        viewport !== prevViewport ||
        canvasConfig !== prevConfig
      ) {
        prevLayers = layers;
        prevSelectedId = selectedLayerId;
        prevViewport = viewport;
        prevConfig = canvasConfig;
        scheduleRender();
      }
    });

    return () => {
      unsub();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { viewport } = useEditorStore.getState();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.05, Math.min(20, viewport.zoom * factor));
      useEditorStore.getState().setViewport({
        zoom: newZoom,
        offsetX: mx - (mx - viewport.offsetX) * (newZoom / viewport.zoom),
        offsetY: my - (my - viewport.offsetY) * (newZoom / viewport.zoom),
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { canvasConfig } = useEditorStore.getState();
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const pad = 40;
    const zoom = Math.min((cw - pad * 2) / canvasConfig.width, (ch - pad * 2) / canvasConfig.height, 1);
    useEditorStore.getState().setViewport({
      zoom,
      offsetX: (cw - canvasConfig.width * zoom) / 2,
      offsetY: (ch - canvasConfig.height * zoom) / 2,
    });
  }, []);

  // Initial fit only (don't reset zoom on every window resize)
  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit event (manual trigger or canvas config change)
  useEffect(() => {
    const handler = () => fitToScreen();
    window.addEventListener('banana-fit', handler);
    return () => window.removeEventListener('banana-fit', handler);
  }, [fitToScreen]);

  // Re-fit when canvas config changes (e.g., user changes canvas size)
  useEffect(() => {
    let prevConfig = useEditorStore.getState().canvasConfig;
    const unsub = useEditorStore.subscribe(() => {
      const config = useEditorStore.getState().canvasConfig;
      if (config !== prevConfig) {
        prevConfig = config;
        fitToScreen();
      }
    });
    return unsub;
  }, [fitToScreen]);

  const cursor = CURSOR_MAP[activeTool] ?? 'default';

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-850">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor }}
      />
      {layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Use the AI panel to generate images</p>
            <p className="text-xs mt-1 text-gray-600">or drop image files here</p>
          </div>
        </div>
      )}
    </div>
  );
}
