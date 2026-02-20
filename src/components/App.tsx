import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import TopBar from './TopBar/TopBar';
import Toolbar from './Toolbar/Toolbar';
import CanvasView from './Canvas/CanvasView';
import LayerPanel from './LayerPanel/LayerPanel';
import AIPanel from './AIPanel/AIPanel';
import PropertyPanel from './PropertyPanel/PropertyPanel';
import SettingsDialog from './common/SettingsDialog';
import ExportDialog from './TopBar/ExportDialog';
import Toast from './common/Toast';
import ShortcutsDialog from './common/ShortcutsDialog';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFileDropzone } from '../hooks/useFileDropzone';
import { ImageIcon } from '../icons';

export default function App() {
  const apiKey = useEditorStore((s) => s.apiKey);
  const settingsOpen = useEditorStore((s) => s.settingsOpen);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);
  const exportOpen = useEditorStore((s) => s.exportDialogOpen);
  const shortcutsOpen = useEditorStore((s) => s.shortcutsOpen);

  useKeyboardShortcuts();
  const { isDraggingOver } = useFileDropzone();

  // Show settings on first launch if no API key
  useEffect(() => {
    if (!apiKey) setSettingsOpen(true);
  }, [apiKey, setSettingsOpen]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white relative">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />

        {/* AI Panel - Left Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-700 flex flex-col">
          <AIPanel />
        </div>

        {/* Canvas - Center */}
        <CanvasView />

        {/* Right Sidebar */}
        <div className="flex flex-col w-64 flex-shrink-0 border-l border-gray-700">
          <div className="flex-shrink-0 overflow-y-auto max-h-[50%]">
            <PropertyPanel />
          </div>
          <div className="flex-1 overflow-hidden border-t border-gray-700 min-h-0">
            <LayerPanel />
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-blue-600/20 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/90 rounded-2xl px-8 py-6 text-center">
            <ImageIcon className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <p className="text-white text-lg font-medium">Drop images to add layers</p>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsDialog />}
      {exportOpen && <ExportDialog />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => useEditorStore.getState().setShortcutsOpen(false)} />}
      <Toast />
    </div>
  );
}
