import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '../../store/editorStore';
import { generateImage, loadImageFromDataUrl, parseApiError } from '../../api/nanoBanana';
import { imageToDataUrl } from '../../engine/ExportManager';
import { createLayerFromImage } from '../../engine/LayerFactory';
import { SparklesIcon, SendIcon, PlusIcon, UploadIcon, SettingsIcon, ImageIcon } from '../../icons';
import type { AIMessage } from '../../types';

const MAX_PROMPT_LENGTH = 2000;

export default function AIPanel() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const requestCounter = useRef(0);

  const apiKey = useEditorStore((s) => s.apiKey);
  const model = useEditorStore((s) => s.selectedModel);
  const aiLoading = useEditorStore((s) => s.aiLoading);
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const aiHistory = selectedLayer?.aiHistory ?? [];

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiHistory.length, aiLoading]);

  // Only auto-switch to generate when layer is deselected;
  // let user's explicit mode choice persist when selecting layers
  useEffect(() => {
    if (!selectedLayer) setMode('generate');
  }, [selectedLayerId]);

  // Clear error when mode or layer changes
  useEffect(() => {
    setErrorMsg(null);
  }, [mode, selectedLayerId]);

  const handleSubmit = async () => {
    // Read fresh state to avoid stale closure / double-invocation
    const store = useEditorStore.getState();
    if (!prompt.trim() || store.aiLoading || !store.apiKey) return;

    const currentPrompt = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
    setPrompt('');
    setErrorMsg(null);
    store.setAiLoading(true);

    // Stale-request guard: if another request fires, this one is abandoned
    const thisRequest = ++requestCounter.current;

    // Capture layer ID from fresh store state (not React closure) to avoid stale refs
    const editLayerId = mode === 'edit' ? store.selectedLayerId : null;

    try {
      if (editLayerId) {
        const currentLayer = store.layers.find((l) => l.id === editLayerId);
        if (!currentLayer) throw new Error('Layer no longer exists');

        const refDataUrl = imageToDataUrl(currentLayer.image);
        const history = currentLayer.aiHistory;

        // Add user message immediately for responsive UX
        const userMsg: AIMessage = {
          id: uuidv4(), role: 'user', text: currentPrompt,
          timestamp: Date.now(),
        };
        store.addAiMessage(editLayerId, userMsg);

        const result = await generateImage(store.apiKey, model, currentPrompt, history, refDataUrl);

        // Abandon if a newer request was fired while waiting
        if (thisRequest !== requestCounter.current) return;

        // Push undo + version AFTER success to avoid orphaned entries on cancel
        const freshStore = useEditorStore.getState();
        freshStore._pushHistory();
        freshStore.pushLayerVersion(editLayerId, refDataUrl, currentPrompt);

        const modelMsg: AIMessage = {
          id: uuidv4(), role: 'model', text: result.text,
          imageDataUrl: result.imageDataUrl ?? undefined,
          timestamp: Date.now(),
        };
        useEditorStore.getState().addAiMessage(editLayerId, modelMsg);

        if (result.imageDataUrl) {
          const newImg = await loadImageFromDataUrl(result.imageDataUrl);
          useEditorStore.getState().replaceLayerImageNoHistory(
            editLayerId, newImg, newImg.naturalWidth, newImg.naturalHeight,
          );
        }
      } else {
        // Generate new layer
        const result = await generateImage(store.apiKey, model, currentPrompt, []);

        // Abandon if a newer request was fired while waiting
        if (thisRequest !== requestCounter.current) return;

        if (result.imageDataUrl) {
          const img = await loadImageFromDataUrl(result.imageDataUrl);
          const config = useEditorStore.getState().canvasConfig;
          const layer = createLayerFromImage(img, currentPrompt.slice(0, 30), config);

          const userMsg: AIMessage = {
            id: uuidv4(), role: 'user', text: currentPrompt,
            timestamp: Date.now(),
          };
          const modelMsg: AIMessage = {
            id: uuidv4(), role: 'model', text: result.text,
            imageDataUrl: result.imageDataUrl ?? undefined,
            timestamp: Date.now(),
          };
          layer.aiHistory = [userMsg, modelMsg];
          layer.versions = [{ imageDataUrl: result.imageDataUrl, prompt: currentPrompt, timestamp: Date.now() }];
          layer.currentVersionIndex = 0;

          useEditorStore.getState().addLayer(layer);
        } else {
          setErrorMsg(result.text || 'No image was generated. Try a different prompt.');
        }
      }
    } catch (err) {
      if (thisRequest !== requestCounter.current) return;

      const message = parseApiError(err);
      console.error('AI generation failed:', err);

      if (editLayerId) {
        const errMsg: AIMessage = {
          id: uuidv4(), role: 'model',
          text: `Error: ${message}`,
          timestamp: Date.now(),
        };
        useEditorStore.getState().addAiMessage(editLayerId, errMsg);
      } else {
        setErrorMsg(message);
      }
    } finally {
      if (thisRequest === requestCounter.current) {
        useEditorStore.getState().setAiLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-400">Nano Banana AI</span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={model}
            onChange={(e) => useEditorStore.getState().setSelectedModel(e.target.value as typeof model)}
            aria-label="AI Model"
            className="text-[11px] bg-gray-800 text-gray-300 border border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
          >
            <option value="gemini-2.5-flash-image">Flash</option>
            <option value="gemini-3-pro-image-preview">Pro</option>
          </select>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-gray-400 hover:text-white p-1 cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="px-3 py-2 flex gap-1">
        <button
          onClick={() => setMode('generate')}
          className={`flex-1 text-xs py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
            mode === 'generate'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'text-gray-400 hover:text-white border border-gray-700'
          }`}
        >
          <PlusIcon className="w-3 h-3 inline mr-1" />
          Generate
        </button>
        <button
          onClick={() => selectedLayer && setMode('edit')}
          disabled={!selectedLayer}
          className={`flex-1 text-xs py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
            mode === 'edit'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-400 hover:text-white border border-gray-700 disabled:opacity-30 disabled:cursor-default'
          }`}
        >
          <SparklesIcon className="w-3 h-3 inline mr-1" />
          Edit Layer
        </button>
      </div>

      {/* Chat / content area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {mode === 'edit' && selectedLayer && aiHistory.length > 0 ? (
          aiHistory.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.text.startsWith('Error:')
                    ? 'bg-red-900/50 text-red-300 border border-red-800/50'
                    : 'bg-gray-800 text-gray-200'
              }`}>
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                {msg.imageDataUrl && (
                  <img src={msg.imageDataUrl} alt="" className="mt-2 rounded-lg max-w-full max-h-40 object-contain" />
                )}
              </div>
              <span className="text-[11px] text-gray-600 mt-0.5">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        ) : mode === 'edit' && selectedLayer && aiHistory.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-8">
            <SparklesIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Describe how to edit "{selectedLayer.name}"</p>
          </div>
        ) : mode === 'generate' ? (
          <div className="text-center text-gray-500 text-xs py-8">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Describe the image you want to create</p>
            <p className="mt-1 text-gray-600">It will be added as a new layer</p>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-xs py-8">
            <p>Select a layer to edit with AI</p>
          </div>
        )}

        {/* Error in generate mode */}
        {errorMsg && mode === 'generate' && (
          <div className="bg-red-900/40 border border-red-800/50 text-red-300 text-xs rounded-xl px-3 py-2">
            {errorMsg}
          </div>
        )}

        {aiLoading && (
          <div className="flex items-center gap-2">
            <div className="bg-gray-800 rounded-xl px-3 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <button
              onClick={() => {
                requestCounter.current++;
                useEditorStore.getState().setAiLoading(false);
              }}
              className="text-[10px] text-gray-500 hover:text-red-400 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="px-3 py-2 border-t border-gray-700">
        {!apiKey && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-2 cursor-pointer hover:bg-yellow-500/20"
          >
            Set API Key to start
          </button>
        )}
        <div className="flex gap-2 items-end">
          <label className="flex-shrink-0 cursor-pointer text-gray-400 hover:text-white p-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors" title="Upload image as layer">
            <UploadIcon className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <div className="flex-1 relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'edit' ? 'Describe the edit...' : 'Describe the image...'}
              disabled={!apiKey || aiLoading}
              rows={2}
              className="w-full bg-gray-800 text-white text-xs rounded-lg border border-gray-700 px-3 py-2 pr-9 resize-none focus:outline-none focus:border-blue-500 placeholder-gray-500 disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || aiLoading || !apiKey}
              className="absolute right-2 bottom-2 text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-default cursor-pointer"
            >
              <SendIcon className="w-4 h-4" />
            </button>
            {prompt.length > MAX_PROMPT_LENGTH * 0.8 && (
              <span className={`absolute right-2 top-1 text-[10px] ${prompt.length >= MAX_PROMPT_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
