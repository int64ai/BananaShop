import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const state = useEditorStore.getState();

      // Undo / Redo always available (use toLowerCase for macOS Cmd+Shift+Z producing 'Z')
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        state.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        state.redo();
        return;
      }

      if (e.key === '?') {
        state.setShortcutsOpen(!state.shortcutsOpen);
        return;
      }

      if (state.exportDialogOpen || state.settingsOpen || state.shortcutsOpen) return;

      switch (e.key.toLowerCase()) {
        case 'v': state.setActiveTool('select'); break;
        case 'm': state.setActiveTool('move'); break;
        case 'h': state.setActiveTool('hand'); break;
        case 'delete':
        case 'backspace':
          if (state.selectedLayerId) {
            state.removeLayer(state.selectedLayerId);
            state.setToast('Layer deleted \u2014 Ctrl+Z to undo');
          }
          break;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        state.setExportDialogOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('banana-fit'));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
