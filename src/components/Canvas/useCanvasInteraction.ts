import { useEffect, useRef } from 'react';
import type React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { screenToCanvas } from '../../engine/Transform';
import { hitTestLayers, hitTestHandle } from '../../engine/HitTester';
import type { DragState } from '../../types';

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space' && !e.repeat) { spaceRef.current = true; e.preventDefault(); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const state = useEditorStore.getState();
      const { viewport, activeTool, layers, selectedLayerId } = state;
      const [cx, cy] = screenToCanvas(sx, sy, viewport);

      // Pan mode
      if (spaceRef.current || activeTool === 'hand') {
        dragRef.current = {
          type: 'pan', startCanvasX: sx, startCanvasY: sy,
          startLayerX: 0, startLayerY: 0, startRotation: 0,
          startScaleX: 1, startScaleY: 1,
          startViewport: { ...viewport },
        };
        return;
      }

      if (activeTool === 'select' || activeTool === 'move') {
        // Check handle hit on selected layer
        const sel = layers.find((l) => l.id === selectedLayerId);
        if (sel) {
          const handle = hitTestHandle(cx, cy, sel, viewport.zoom);
          if (handle) {
            state._pushHistory();
            if (handle.type === 'rotate') {
              dragRef.current = {
                type: 'rotate', layerId: sel.id, handle: handle.type,
                startCanvasX: cx, startCanvasY: cy,
                startLayerX: sel.transform.x, startLayerY: sel.transform.y,
                startRotation: sel.transform.rotation,
                startScaleX: sel.transform.scaleX, startScaleY: sel.transform.scaleY,
                startViewport: viewport,
              };
            } else {
              dragRef.current = {
                type: 'scale', layerId: sel.id, handle: handle.type,
                startCanvasX: cx, startCanvasY: cy,
                startLayerX: sel.transform.x, startLayerY: sel.transform.y,
                startRotation: sel.transform.rotation,
                startScaleX: sel.transform.scaleX, startScaleY: sel.transform.scaleY,
                startViewport: viewport,
              };
            }
            return;
          }
        }

        // Hit test layers
        const hit = hitTestLayers(layers, cx, cy);
        if (hit) {
          state.selectLayer(hit.id);
          state._pushHistory();
          dragRef.current = {
            type: 'move', layerId: hit.id,
            startCanvasX: cx, startCanvasY: cy,
            startLayerX: hit.transform.x, startLayerY: hit.transform.y,
            startRotation: hit.transform.rotation,
            startScaleX: hit.transform.scaleX, startScaleY: hit.transform.scaleY,
            startViewport: viewport,
          };
        } else {
          state.selectLayer(null);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { viewport } = useEditorStore.getState();
      const [cx, cy] = screenToCanvas(sx, sy, viewport);

      if (drag.type === 'pan') {
        const dx = sx - drag.startCanvasX;
        const dy = sy - drag.startCanvasY;
        useEditorStore.getState().setViewport({
          offsetX: drag.startViewport.offsetX + dx,
          offsetY: drag.startViewport.offsetY + dy,
        });
        return;
      }

      if (drag.type === 'move' && drag.layerId) {
        const dx = cx - drag.startCanvasX;
        const dy = cy - drag.startCanvasY;
        useEditorStore.getState().updateLayerTransform(drag.layerId, {
          x: drag.startLayerX + dx,
          y: drag.startLayerY + dy,
        });
      }

      if (drag.type === 'rotate' && drag.layerId) {
        const angle = Math.atan2(cy - drag.startLayerY, cx - drag.startLayerX);
        const startAngle = Math.atan2(drag.startCanvasY - drag.startLayerY, drag.startCanvasX - drag.startLayerX);
        let delta = ((angle - startAngle) * 180) / Math.PI;
        if (e.shiftKey) delta = Math.round(delta / 15) * 15;
        useEditorStore.getState().updateLayerTransform(drag.layerId, {
          rotation: drag.startRotation + delta,
        });
      }

      if (drag.type === 'scale' && drag.layerId) {
        const startDist = Math.hypot(drag.startCanvasX - drag.startLayerX, drag.startCanvasY - drag.startLayerY);
        const curDist = Math.hypot(cx - drag.startLayerX, cy - drag.startLayerY);
        if (startDist < 1) return;
        const ratio = Math.max(0.01, curDist / startDist);
        useEditorStore.getState().updateLayerTransform(drag.layerId, {
          scaleX: drag.startScaleX * ratio,
          scaleY: drag.startScaleY * ratio,
        });
      }
    };

    const onMouseUp = () => {
      const drag = dragRef.current;
      // Discard no-op history entries when the user clicked but didn't drag
      if (drag && drag.type !== 'pan' && drag.layerId) {
        const layer = useEditorStore.getState().layers.find((l) => l.id === drag.layerId);
        if (layer) {
          const t = layer.transform;
          const unchanged =
            t.x === drag.startLayerX &&
            t.y === drag.startLayerY &&
            t.rotation === drag.startRotation &&
            t.scaleX === drag.startScaleX &&
            t.scaleY === drag.startScaleY;
          if (unchanged) {
            // Pop the no-op history entry
            const { _history } = useEditorStore.getState();
            if (_history.length > 0) {
              useEditorStore.setState({ _history: _history.slice(0, -1) });
            }
          }
        }
      }
      dragRef.current = null;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasRef]);
}
