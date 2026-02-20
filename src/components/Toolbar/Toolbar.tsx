import { useEditorStore } from '../../store/editorStore';
import { SelectIcon, MoveIcon, HandIcon } from '../../icons';
import type { ActiveTool } from '../../types';

const tools: Array<{ id: ActiveTool; Icon: typeof SelectIcon; label: string; key: string }> = [
  { id: 'select', Icon: SelectIcon, label: 'Select', key: 'V' },
  { id: 'move', Icon: MoveIcon, label: 'Move', key: 'M' },
  { id: 'hand', Icon: HandIcon, label: 'Hand', key: 'H' },
];

export default function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  return (
    <div className="w-10 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-2 gap-1">
      {tools.map(({ id, Icon, label, key }) => (
        <button
          key={id}
          onClick={() => setActiveTool(id)}
          className={`w-8 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ${
            activeTool === id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title={`${label} (${key})`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
