import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEditorStore } from '../../store/editorStore';
import LayerItem from './LayerItem';
import { LayersIcon } from '../../icons';

export default function LayerPanel() {
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const reorderLayers = useEditorStore((s) => s.reorderLayers);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Display in reverse order (top layer first)
  const displayLayers = [...layers].reverse();
  const lastIdx = layers.length - 1;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromDisplay = displayLayers.findIndex((l) => l.id === active.id);
    const toDisplay = displayLayers.findIndex((l) => l.id === over.id);
    if (fromDisplay === -1 || toDisplay === -1) return;
    reorderLayers(lastIdx - fromDisplay, lastIdx - toDisplay);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-1.5 border-b border-gray-700">
        <LayersIcon className="w-3.5 h-3.5" />
        Layers
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {displayLayers.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">No layers yet</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayLayers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {displayLayers.map((layer) => (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={layer.id === selectedLayerId}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
