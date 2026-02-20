import { useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { removeBackground } from '../../engine/BackgroundRemoval';
import { loadImageFromDataUrl } from '../../api/nanoBanana';
import { imageToDataUrl } from '../../engine/ExportManager';

export default function PropertyPanel() {
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const updateLayerTransform = useEditorStore((s) => s.updateLayerTransform);
  const setLayerOpacity = useEditorStore((s) => s.setLayerOpacity);
  const bgProgress = useEditorStore((s) => s.bgRemovalProgress);

  // Track whether undo was pushed for current input interaction to avoid no-op entries
  const undoPushedRef = useRef(false);
  const opacityUndoPushedRef = useRef(false);

  const layer = layers.find((l) => l.id === selectedLayerId);
  if (!layer) {
    return (
      <div className="px-3 py-4 text-xs text-gray-500 text-center">
        Select a layer to edit properties
      </div>
    );
  }

  const t = layer.transform;

  const numInput = (label: string, value: number, onChange: (v: number) => void, step = 1) => {
    const ariaLabels: Record<string, string> = { X: 'Position X', Y: 'Position Y', W: 'Width', H: 'Height', R: 'Rotation' };
    return (
      <label className="flex items-center gap-1.5">
        <span className="text-gray-400 w-3 text-right">{label}</span>
        <input
          type="number"
          value={Math.round(value * 100) / 100}
          onFocus={() => { undoPushedRef.current = false; }}
          onChange={(e) => {
            if (!undoPushedRef.current) {
              useEditorStore.getState()._pushHistory();
              undoPushedRef.current = true;
            }
            onChange(Number(e.target.value));
          }}
          step={step}
          aria-label={ariaLabels[label] ?? label}
          className="flex-1 w-0 bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </label>
    );
  };

  const handleRemoveBg = async () => {
    if (!layer) return;
    // Capture layer ID, read fresh image from store to avoid stale closure
    const layerId = layer.id;
    const freshLayer = useEditorStore.getState().layers.find((l) => l.id === layerId);
    if (!freshLayer) return;

    useEditorStore.getState().setBgRemovalProgress(0);
    try {
      const resultBlob = await removeBackground(freshLayer.image, (_key, current, total) => {
        useEditorStore.getState().setBgRemovalProgress(total > 0 ? current / total : 0);
      });
      // Convert blob to data URL to avoid issues with revoked object URLs
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });
      const newImg = await loadImageFromDataUrl(dataUrl);

      // Push undo AFTER success to avoid phantom entries on failure
      const store = useEditorStore.getState();
      store._pushHistory();
      store.replaceLayerImageNoHistory(layerId, newImg, newImg.naturalWidth, newImg.naturalHeight);
      store.pushLayerVersion(layerId, dataUrl, '[Background Removed]');
    } catch (err) {
      console.error('Background removal failed:', err);
      useEditorStore.getState().setToast(`Background removal failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      useEditorStore.getState().setBgRemovalProgress(-1);
    }
  };

  return (
    <div className="px-3 py-2 space-y-3">
      <div className="text-xs font-semibold text-gray-400">Transform</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {numInput('X', t.x, (v) => updateLayerTransform(layer.id, { x: v }))}
        {numInput('Y', t.y, (v) => updateLayerTransform(layer.id, { y: v }))}
        {numInput('W', layer.originalWidth * t.scaleX, (v) => updateLayerTransform(layer.id, { scaleX: v / layer.originalWidth }), 0.1)}
        {numInput('H', layer.originalHeight * t.scaleY, (v) => updateLayerTransform(layer.id, { scaleY: v / layer.originalHeight }), 0.1)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {numInput('R', t.rotation, (v) => updateLayerTransform(layer.id, { rotation: v }))}
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Opacity</span>
          <span className="text-gray-300">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.opacity}
          onPointerDown={() => { opacityUndoPushedRef.current = false; }}
          onChange={(e) => {
            if (!opacityUndoPushedRef.current) {
              useEditorStore.getState()._pushHistory();
              opacityUndoPushedRef.current = true;
            }
            setLayerOpacity(layer.id, Number(e.target.value));
          }}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Version history */}
      {layer.versions.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Versions ({layer.versions.length})</div>
          <div className="max-h-20 overflow-y-auto space-y-0.5">
            {layer.versions.map((v, i) => (
              <button
                key={i}
                onClick={async () => {
                  const img = await loadImageFromDataUrl(v.imageDataUrl);
                  useEditorStore.getState().replaceLayerImage(layer.id, img, img.naturalWidth, img.naturalHeight);
                  useEditorStore.setState((s) => ({
                    layers: s.layers.map((l) =>
                      l.id === layer.id ? { ...l, currentVersionIndex: i } : l,
                    ),
                  }));
                }}
                className={`w-full text-left text-[10px] px-2 py-1 rounded cursor-pointer truncate ${
                  i === layer.currentVersionIndex
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                v{i + 1}: {v.prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Background removal */}
      <button
        onClick={handleRemoveBg}
        disabled={bgProgress >= 0}
        className="w-full text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white py-1.5 rounded-lg cursor-pointer disabled:cursor-default transition-colors"
      >
        {bgProgress >= 0 ? `Removing... ${Math.round(bgProgress * 100)}%` : 'Remove Background'}
      </button>
    </div>
  );
}
