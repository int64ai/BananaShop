import { GoogleGenAI } from '@google/genai';
import type { NanoBananaModel, AIMessage } from '../types';

let clientInstance: GoogleGenAI | null = null;
let cachedKey: string | null = null;

function getClient(apiKey: string): GoogleGenAI {
  if (!clientInstance || cachedKey !== apiKey) {
    clientInstance = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return clientInstance;
}

/** Reset client (e.g., when API key changes) */
export function resetClient(): void {
  clientInstance = null;
  cachedKey = null;
}

/** Convert a data URL to { base64, mimeType } */
function dataUrlToBase64(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  return { mimeType: match[1], data: match[2] };
}

export interface GenerateResult {
  text: string;
  imageDataUrl: string | null;
}

/** Parse Gemini API errors into user-friendly messages. */
export function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Unknown error occurred';
  const msg = err.message.toLowerCase();

  if (msg.includes('api_key_invalid') || msg.includes('401'))
    return 'Invalid API key. Check your settings.';
  if (msg.includes('rate_limit') || msg.includes('429'))
    return 'Rate limit reached. Please wait a moment and try again.';
  if (msg.includes('safety') || msg.includes('blocked'))
    return 'Content was blocked by safety filters. Try a different prompt.';
  if (msg.includes('quota') || msg.includes('resource_exhausted'))
    return 'API quota exhausted. Check your Google Cloud billing.';
  if (msg.includes('permission') || msg.includes('403'))
    return 'Permission denied. Ensure the Gemini API is enabled for your key.';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch'))
    return 'Network error. Check your internet connection.';
  if (msg.includes('image') && msg.includes('too large'))
    return 'Image is too large. Try with a smaller image.';

  return err.message;
}

/**
 * Generate or edit an image using Nano Banana API.
 *
 * - Text only → generates new image
 * - Text + reference image → edits the image
 * - Conversation history → multi-turn refinement
 *
 * History images are omitted from the payload to avoid massive requests;
 * only the current reference image (latest layer state) is sent.
 */
export async function generateImage(
  apiKey: string,
  model: NanoBananaModel,
  prompt: string,
  history: AIMessage[],
  referenceImageDataUrl?: string,
): Promise<GenerateResult> {
  const client = getClient(apiKey);

  // Build contents from history + new prompt
  type Part = { text?: string; inlineData?: { data: string; mimeType: string } };
  const contents: Array<{ role: string; parts: Part[] }> = [];

  // Add conversation history — text only (the current image state is sent as reference below).
  // This avoids sending potentially hundreds of MB of base64 images in the payload.
  for (const msg of history) {
    const parts: Part[] = [];
    if (msg.text) parts.push({ text: msg.text });
    if (parts.length > 0) {
      contents.push({ role: msg.role, parts });
    }
  }

  // Add new user message with the current reference image
  const userParts: Part[] = [{ text: prompt }];
  if (referenceImageDataUrl) {
    const { data, mimeType } = dataUrlToBase64(referenceImageDataUrl);
    userParts.push({ inlineData: { data, mimeType } });
  }
  contents.push({ role: 'user', parts: userParts });

  const response = await client.models.generateContent({
    model,
    contents,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  let resultText = '';
  let resultImageDataUrl: string | null = null;

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.text) {
        resultText += part.text;
      }
      if (part.inlineData) {
        const b64 = part.inlineData.data;
        const mime = part.inlineData.mimeType;
        resultImageDataUrl = `data:${mime};base64,${b64}`;
      }
    }
  }

  return { text: resultText, imageDataUrl: resultImageDataUrl };
}

/**
 * Load an image element from a data URL.
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}
