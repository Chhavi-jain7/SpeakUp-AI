import { GoogleGenAI } from '@google/genai';

export class AppError extends Error {
  constructor(code, userMessage, status = 500) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
  }
}

let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('NO_KEY', 'The server has no Gemini API key yet. Add GEMINI_API_KEY to backend/.env and restart.', 500);
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

let workingTextModel, workingTtsModel;
const unique = (a) => [...new Set(a.filter(Boolean))];
const textModels = () => unique([workingTextModel, process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash']);
const ttsModels = () => unique([workingTtsModel, process.env.GEMINI_TTS_MODEL, 'gemini-2.5-flash-preview-tts']);

const raw = (err) => `${err?.status ?? ''} ${err?.message ?? err}`.toLowerCase();
const isModelMissing = (err) => /404|not found|not supported|unsupported model|is not available/.test(raw(err));
const isBusy = (err) => /503|unavailable|overloaded|high demand/.test(raw(err));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function mapError(err) {
  if (err instanceof AppError) return err;
  const m = raw(err);
  if (isBusy(err))
    return new AppError('BUSY', 'The AI is busy right now. Wait a few seconds and try again.', 503);
  if (/api key|api_key|permission_denied|403|401|unauthenticated/.test(m) && !/quota/.test(m))
    return new AppError('INVALID_KEY', 'The Gemini API key looks invalid. Check GEMINI_API_KEY in backend/.env and restart the server.', 401);
  if (/429|quota|rate|resource_exhausted/.test(m))
    return new AppError('RATE_LIMIT', 'The AI is getting a lot of requests right now. Give it a few seconds and try again.', 429);
  if (/fetch failed|enotfound|econn|etimedout|network/.test(m))
    return new AppError('NETWORK', "The server couldn't reach Gemini. Check the internet connection and try again.", 502);
  console.error('Gemini error:', err?.message || err);
  return new AppError('AI_FAILED', 'The AI had trouble with that one. Please try again.', 502);
}

function parseJson(text) {
  const clean = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s >= 0 && e > s) {
      try { return JSON.parse(clean.slice(s, e + 1)); } catch { /* fall through */ }
    }
    throw new AppError('BAD_AI_JSON', 'The AI answered in a format I could not read. Please try again.', 502);
  }
}

/** Try each model; retry busy ones with a short backoff; skip models that don't exist. */
async function withFallback(models, call) {
  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await call(model);
      } catch (err) {
        lastErr = err;
        if (isBusy(err) && attempt < 2) { await wait(1000 * (attempt + 1)); continue; }
        break;
      }
    }
    if (!isModelMissing(lastErr) && !isBusy(lastErr)) break; // a real error: don't keep hammering
    console.warn(`Model ${model} unavailable, trying the next one…`);
  }
  throw mapError(lastErr);
}

export async function generateJson({ contents, systemInstruction, temperature = 0.9 }) {
  const ai = getClient();
  return withFallback(textModels(), async (model) => {
    const res = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction, temperature, responseMimeType: 'application/json' },
    });
    workingTextModel = model;
    return parseJson(res.text);
  });
}

/** Text-to-speech. Returns { data: base64 PCM16 mono, sampleRate }. */
export async function synthesize(text, voiceName = 'Kore') {
  const ai = getClient();
  return withFallback(ttsModels(), async (model) => {
    const res = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error('no audio returned');
    workingTtsModel = model;
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1]) || 24000;
    return { data: part.inlineData.data, sampleRate: rate };
  });
}

/** Convert [{role:'user'|'model', text}] into Gemini contents. */
export function toContents(history = []) {
  const items = history.slice(-30).filter((h) => h?.text).map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: String(h.text).slice(0, 2000) }],
  }));
  if (items.length && items[0].role === 'model') items.unshift({ role: 'user', parts: [{ text: '[The session has just started.]' }] });
  return items;
}