import { useEffect } from 'react';
import { XIcon } from '../../icons';

const shortcuts = [
  { key: 'V', desc: 'Select tool' },
  { key: 'M', desc: 'Move tool' },
  { key: 'H', desc: 'Hand tool (pan)' },
  { key: 'Space + Drag', desc: 'Pan canvas' },
  { key: 'Scroll', desc: 'Zoom in/out' },
  { key: 'Ctrl + Z', desc: 'Undo' },
  { key: 'Ctrl + Shift + Z', desc: 'Redo' },
  { key: 'Delete', desc: 'Delete selected layer' },
  { key: 'Ctrl + E', desc: 'Export image' },
  { key: 'Ctrl + 0', desc: 'Fit to screen' },
  { key: '?', desc: 'Show shortcuts' },
];

export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{desc}</span>
              <kbd className="bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
