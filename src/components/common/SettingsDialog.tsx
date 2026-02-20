import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { resetClient } from '../../api/nanoBanana';
import { XIcon } from '../../icons';

export default function SettingsDialog() {
  const apiKey = useEditorStore((s) => s.apiKey);
  const setApiKey = useEditorStore((s) => s.setApiKey);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);
  const model = useEditorStore((s) => s.selectedModel);
  const setModel = useEditorStore((s) => s.setSelectedModel);

  const [draft, setDraft] = useState(apiKey);
  const canDismiss = !!apiKey; // Can only dismiss if key already exists

  const handleSave = () => {
    if (!draft.trim()) return;
    setApiKey(draft.trim());
    resetClient();
    setSettingsOpen(false);
  };

  const handleDismiss = () => {
    if (canDismiss) setSettingsOpen(false);
  };

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) setSettingsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canDismiss, setSettingsOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-96 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="settings-title" className="text-sm font-semibold text-white">Settings</h2>
          {canDismiss && (
            <button onClick={handleDismiss} className="text-gray-400 hover:text-white cursor-pointer">
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {!canDismiss && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-lg px-3 py-2 mb-4">
            An API key is required to use BananaShop.
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-gray-400 block mb-1">Gemini API Key</label>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Enter your Gemini API key..."
              autoFocus
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <p className="text-gray-500 mt-1.5">
              Get your key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                aistudio.google.com
              </a>
            </p>
            <p className="text-gray-600 mt-1">
              Your key is stored locally in this browser only.
            </p>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Default Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as typeof model)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="gemini-2.5-flash-image">Nano Banana — Fast</option>
              <option value="gemini-3-pro-image-preview">Nano Banana Pro — Quality</option>
            </select>
          </div>

          <div className="flex gap-2">
            {canDismiss && (
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg cursor-pointer disabled:cursor-default transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
