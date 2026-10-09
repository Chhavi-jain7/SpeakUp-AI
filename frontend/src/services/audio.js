let ctx;
const getCtx = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

/** Call once from a user gesture so playback is allowed later. */
export async function unlockAudio() {
  const c = getCtx();
  if (c.state === 'suspended') await c.resume();
}

/** Play base64 16-bit mono PCM (Gemini TTS output). Returns { promise, stop }. */
export function playPcm(b64, rate = 24000) {
  const c = getCtx();
  const bin = atob(b64);
  const n = bin.length >> 1;
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    if (v >= 0x8000) v -= 0x10000;
    f[i] = v / 32768;
  }
  const buf = c.createBuffer(1, n, rate);
  buf.copyToChannel(f, 0);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  let finish;
  const promise = new Promise((r) => { finish = r; src.onended = () => r(); });
  src.start();
  return { promise, stop: () => { try { src.stop(); } catch { /* already stopped */ } finish(); } };
}

/** Fallback voice if cloud TTS fails. */
export function speakBrowser(text) {
  const synth = window.speechSynthesis;
  if (!synth) {
    const t = setTimeout(() => {}, 0); clearTimeout(t);
    let finish; const promise = new Promise((r) => { finish = r; setTimeout(r, Math.min(9000, text.length * 65)); });
    return { promise, stop: () => finish() };
  }
  let finish;
  const promise = new Promise((resolve) => {
    finish = resolve;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.98;
    u.onend = resolve;
    u.onerror = resolve;
    synth.cancel();
    synth.speak(u);
  });
  return { promise, stop: () => { synth.cancel(); finish(); } };
}

/** Float32 chunks -> mono 16-bit WAV (base64), resampled to outRate. */
export function toWavBase64(chunks, inRate, outRate = 16000) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const input = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { input.set(c, o); o += c.length; }

  const ratio = inRate / outRate;
  const len = Math.floor(input.length / ratio);
  const pcm = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * ratio, i0 = Math.floor(pos), i1 = Math.min(i0 + 1, input.length - 1);
    const s = input[i0] + (input[i1] - input[i0]) * (pos - i0);
    pcm[i] = Math.max(-1, Math.min(1, s)) * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buffer);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, outRate, true); v.setUint32(28, outRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buffer, 44).set(pcm);

  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const countWords = (t) => (t.trim().match(/\S+/g) || []).length;

export function friendlyMediaError(e, kind = 'microphone') {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError')
    return `Your ${kind} is blocked. Click the lock icon next to the address bar, allow the ${kind}, and try again.`;
  if (n === 'NotFoundError' || n === 'OverconstrainedError')
    return `Your ${kind} isn't available. Check that one is plugged in and not used by another app.`;
  if (n === 'NotReadableError' || n === 'AbortError')
    return `Another app seems to be using your ${kind}. Close it and try again.`;
  return `Your ${kind} isn't available. Please check your browser permissions and try again.`;
}

export function browserSupportsVoice() {
  return Boolean(navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext) && window.AudioWorkletNode);
}
