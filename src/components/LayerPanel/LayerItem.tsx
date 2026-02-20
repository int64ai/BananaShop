import { useRef, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '../../store/editorStore';
import { EyeIcon, EyeOffIcon, TrashIcon, CopyIcon } from '../../icons';
import type { LayerData } from '../../types';

interface Props {
  layer: LayerData;
  isSelected: boolean;
}

export default function LayerItem({ layer, isSelected }: Props) {
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const selectLayer = useEditorStore((s) => s.selectLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const toggleVisibility = useEditorStore((s) => s.toggleVisibility);
  const renameLayer = useEditorStore((s) => s.renameLayer);
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer);

  const {
    attributes, listeners, setNodeRef, transform, transition,
  } = useSortable({ id: layer.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Draw thumbnail
  useEffect(() => {
    const c = thumbRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const size = 36;
    c.width = size;
    c.height = size;
    ctx.clearRect(0, 0, size, size);

    // Checkerboard
    const s = 4;
    for (let y = 0; y < size; y += s) {
      for (let x = 0; x < size; x += s) {
        ctx.fillStyle = (x / s + y / s) % 2 === 0 ? '#e5e7eb' : '#fff';
        ctx.fillRect(x, y, s, s);
      }
    }

    const w = layer.originalWidth;
    const h = layer.originalHeight;
    const sc = Math.min(size / w, size / h);
    const dw = w * sc;
    const dh = h * sc;
    ctx.drawImage(layer.image, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }, [layer.image, layer.originalWidth, layer.originalHeight]);

  const commitRename = () => {
    setEditing(false);
    if (editName.trim() && editName !== layer.name) {
      renameLayer(layer.id, editName.trim());
    } else {
      setEditName(layer.name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => selectLayer(layer.id)}
      onDoubleClick={() => { setEditing(true); setEditName(layer.name); }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-800 border border-transparent'
      }`}
    >
      <canvas ref={thumbRef} className="w-9 h-9 rounded flex-shrink-0 border border-gray-700" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setEditName(layer.name); } }}
            className="w-full bg-gray-800 text-white text-xs px-1 py-0.5 rounded border border-blue-500 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-xs text-white truncate">{layer.name}</p>
        )}
        <p className="text-[10px] text-gray-500">
          {layer.originalWidth} x {layer.originalHeight}
        </p>
      </div>
      <div className="flex items-center gap-0 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
          className="p-1 text-gray-500 hover:text-white cursor-pointer"
          title="Toggle visibility"
        >
          {layer.visible ? <EyeIcon className="w-3 h-3" /> : <EyeOffIcon className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
          className="p-1 text-gray-500 hover:text-blue-400 cursor-pointer"
          title="Duplicate layer"
        >
          <CopyIcon className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); useEditorStore.getState().setToast('Layer deleted \u2014 Ctrl+Z to undo'); }}
          className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"
          title="Delete layer"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
