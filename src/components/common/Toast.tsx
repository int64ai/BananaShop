import { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';

export default function Toast() {
  const message = useEditorStore((s) => s.toastMessage);
  const setToast = useEditorStore((s) => s.setToast);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [message, setToast]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="animate-[fadeInUp_0.2s_ease-out] pointer-events-auto">
        <div className="bg-gray-800 border border-gray-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-md">
          {message}
        </div>
      </div>
    </div>
  );
}
