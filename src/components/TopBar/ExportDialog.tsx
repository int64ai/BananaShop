import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { exportToBlob, downloadBlob } from '../../engine/ExportManager';
import type { ExportFormat } from '../../engine/ExportManager';
import { XIcon } from '../../icons';

export default function ExportDialog() {
  const layers = useEditorStore((s) => s.layers);
  const config = useEditorStore((s) => s.canvasConfig);
  const setOpen = useEditorStore((s) => s.setExportDialogOpen);

  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when export params change
  useEffect(() => { setError(null); }, [format, quality, scale]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setOpen]);

  const handleExport = async () => {
    // Validate export dimensions against browser canvas limits
    const exportW = config.width * scale;
    const exportH = config.height * scale;
    const maxDim = 16384;
    const maxPixels = 100_000_000;
    if (exportW > maxDim || exportH > maxDim) {
      setError(`Export dimensions too large (${exportW}×${exportH}). Maximum is ${maxDim}px per side. Reduce canvas size or scale.`);
      return;
    }
    if (exportW * exportH > maxPixels) {
      setError(`Export has too many pixels (${Math.round(exportW * exportH / 1_000_000)}M). Reduce canvas size or scale.`);
      return;
    }

    setExporting(true);
    setError(null);
    try {
      const blob = await exportToBlob(layers, config, { format, quality, scale });
      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      downloadBlob(blob, `bananashop-${ts}.${format}`);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Export Image</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {layers.length === 0 && (
            <div className="bg-gray-800 text-gray-400 text-center rounded-lg py-3 px-2">
              No layers to export. Generate or upload images first.
            </div>
          )}

          <div>
            <label className="text-gray-400 block mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="png">PNG (lossless, transparent)</option>
              <option value="jpeg">JPEG (smaller, no transparency)</option>
              <option value="webp">WebP (modern, smaller)</option>
            </select>
          </div>

          {format !== 'png' && (
            <div>
              <div className="flex justify-between text-gray-400 mb-1">
                <span>Quality</span>
                <span>{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range" min={0.1} max={1} step={0.01}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}

          <div>
            <label className="text-gray-400 block mb-1">Scale</label>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`flex-1 py-1.5 rounded border cursor-pointer transition-colors ${
                    scale === s
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <p className="text-gray-500 mt-1">
              {config.width * scale} x {config.height * scale} px
            </p>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-800/50 text-red-300 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting || layers.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 rounded-lg cursor-pointer disabled:cursor-default transition-colors"
          >
            {exporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
