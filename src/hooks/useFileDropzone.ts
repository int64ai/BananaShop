import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { createLayerFromImage } from '../engine/LayerFactory';

export function useFileDropzone() {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      counterRef.current++;
      if (counterRef.current === 1) setIsDraggingOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      counterRef.current--;
      if (counterRef.current === 0) setIsDraggingOver(false);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      counterRef.current = 0;
      setIsDraggingOver(false);

      const files = e.dataTransfer?.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          const config = useEditorStore.getState().canvasConfig;
          const layer = createLayerFromImage(img, file.name, config);
          useEditorStore.getState().addLayer(layer);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          useEditorStore.getState().setToast(`Could not load "${file.name}". Format may not be supported.`);
        };
        img.src = url;
      }
    };

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);

    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  return { isDraggingOver };
}
