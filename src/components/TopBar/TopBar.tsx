import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { DownloadIcon, UndoIcon, RedoIcon, BananaIcon } from '../../icons';

function zoomTowardCenter(newZoom: number) {
  const state = useEditorStore.getState();
  const { viewport, canvasConfig } = state;
  const canvasCenterX = canvasConfig.width / 2;
  const canvasCenterY = canvasConfig.height / 2;
  const screenCX = canvasCenterX * viewport.zoom + viewport.offsetX;
  const screenCY = canvasCenterY * viewport.zoom + viewport.offsetY;
  state.setViewport({
    zoom: newZoom,
    offsetX: screenCX - canvasCenterX * newZoom,
    offsetY: screenCY - canvasCenterY * newZoom,
  });
}

const btn = 'text-gray-400 hover:text-white px-1.5 cursor-pointer disabled:text-gray-600 disabled:cursor-default';

export default function TopBar() {
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const setCanvasConfig = useEditorStore((s) => s.setCanvasConfig);
  const viewport = useEditorStore((s) => s.viewport);
  const setExportOpen = useEditorStore((s) => s.setExportDialogOpen);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const histLen = useEditorStore((s) => s._history.length);
  const futureLen = useEditorStore((s) => s._future.length);

  const [localW, setLocalW] = useState(String(canvasConfig.width));
  const [localH, setLocalH] = useState(String(canvasConfig.height));

  useEffect(() => {
    setLocalW(String(canvasConfig.width));
    setLocalH(String(canvasConfig.height));
  }, [canvasConfig.width, canvasConfig.height]);

  const commitWidth = () => {
    const w = Math.max(1, Math.min(8192, Number(localW) || 1));
    setCanvasConfig({ ...canvasConfig, width: w });
    setLocalW(String(w));
  };

  const commitHeight = () => {
    const h = Math.max(1, Math.min(8192, Number(localH) || 1));
    setCanvasConfig({ ...canvasConfig, height: h });
    setLocalH(String(h));
  };

  return (
    <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-3">
      <div className="flex items-center gap-1.5 select-none">
        <BananaIcon className="w-5 h-5 text-yellow-400" />
        <span className="text-sm font-bold text-yellow-400 tracking-tight">BananaShop</span>
      </div>

      <div className="h-5 w-px bg-gray-700" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button onClick={undo} disabled={histLen === 0} className={btn} title="Undo (Ctrl+Z)">
          <UndoIcon className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={futureLen === 0} className={btn} title="Redo (Ctrl+Shift+Z)">
          <RedoIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-px bg-gray-700" />

      {/* Canvas size */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <label>W</label>
        <input
          type="number"
          value={localW}
          onChange={(e) => setLocalW(e.target.value)}
          onBlur={commitWidth}
          onKeyDown={(e) => { if (e.key === 'Enter') commitWidth(); }}
          className="w-16 bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 text-xs focus:border-blue-500 focus:outline-none"
        />
        <label>H</label>
        <input
          type="number"
          value={localH}
          onChange={(e) => setLocalH(e.target.value)}
          onBlur={commitHeight}
          onKeyDown={(e) => { if (e.key === 'Enter') commitHeight(); }}
          className="w-16 bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="h-5 w-px bg-gray-700" />

      {/* Zoom */}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 min-w-[3.5rem] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button onClick={() => zoomTowardCenter(Math.min(10, viewport.zoom * 1.25))} className={btn} title="Zoom in">+</button>
        <button onClick={() => zoomTowardCenter(Math.max(0.1, viewport.zoom / 1.25))} className={btn} title="Zoom out">-</button>
        <button onClick={() => zoomTowardCenter(1)} className={btn + ' text-[10px]'} title="Reset zoom to 100%">1:1</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('banana-fit'))} className={btn + ' text-[10px]'} title="Fit to screen (Ctrl+0)">Fit</button>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setExportOpen(true)}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        Export
      </button>
    </div>
  );
}
