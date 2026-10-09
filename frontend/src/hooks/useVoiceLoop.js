import { useCallback, useEffect, useRef, useState } from 'react';
import { toWavBase64, friendlyMediaError, browserSupportsVoice } from '../services/audio.js';

// Captures raw mic audio in small chunks on the audio thread.
const WORKLET = `
class Cap extends AudioWorkletProcessor {
  constructor(){ super(); this.b = new Float32Array(2048); this.n = 0; }
  process(inputs){
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.b[this.n++] = ch[i];
      if (this.n === 2048) { this.port.postMessage(this.b.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('cap', Cap);`;

/**
 * Voice turn-taking loop.
 * status: idle | listening | recording | thinking | speaking | paused
 * The mic track is DISABLED whenever we are not listening, so the AI never hears itself.
 */
export function useVoiceLoop({ silenceMs = 1400, maxMs = 90000, onUtterance }) {
  const [status, setStatus] = useState('idle');
  const [level, setLevel] = useState(0);
  const s = useRef({ active: false });
  const cb = useRef(onUtterance);
  cb.current = onUtterance;
  const lastLevelUpdate = useRef(0);

  const setTrack = (on) => s.current.stream?.getAudioTracks().forEach((t) => { t.enabled = on; });

  const listen = useCallback(() => {
    const st = s.current;
    if (!st.stream) return;
    Object.assign(st, { active: true, speaking: false, preroll: [], chunks: [], loudRun: 0, silence: 0, voiced: 0, totalMs: 0, longPauses: 0, speechMs: 0 });
    setTrack(true);
    setStatus('listening');
  }, []);

  const hold = useCallback((next) => {
    const st = s.current;
    st.active = false; st.speaking = false; st.chunks = []; st.preroll = [];
    setTrack(false);
    setLevel(0);
    setStatus(next);
  }, []);

  const finalize = () => {
    const st = s.current;
    const { chunks, voiced, speechMs, longPauses, sampleRate } = st;
    st.active = false; st.speaking = false; st.chunks = [];
    if (voiced < 350) { listen(); return; } // a cough or a click, not a turn
    hold('thinking');
    const audio = toWavBase64(chunks, sampleRate, 16000);
    cb.current?.({ audio, mimeType: 'audio/wav', stats: { durationSec: Math.max(0.5, speechMs / 1000), longPauses } });
  };

  // Latest chunk handler, so the worklet callback never goes stale.
  const onChunk = useRef();
  onChunk.current = (f) => {
    const st = s.current;
    let sum = 0;
    for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
    const rms = Math.sqrt(sum / f.length);
    const now = performance.now();
    if (now - lastLevelUpdate.current > 70) { lastLevelUpdate.current = now; setLevel(st.active ? Math.min(1, rms * 9) : 0); }
    if (!st.active) return;

    const dur = (f.length / st.sampleRate) * 1000;
    const thr = Math.max(0.018, st.noise * 3);
    const loud = rms > (st.speaking ? thr * 0.7 : thr);

    if (!st.speaking) {
      st.preroll.push(f);
      if (st.preroll.length > 10) st.preroll.shift();
      if (!loud) st.noise = st.noise * 0.97 + rms * 0.03; // adapt to room noise
      st.loudRun = loud ? st.loudRun + dur : 0;
      if (st.loudRun >= 120) {
        Object.assign(st, { speaking: true, chunks: st.preroll, preroll: [], voiced: st.loudRun, silence: 0, totalMs: st.loudRun, speechMs: st.loudRun, longPauses: 0 });
        setStatus('recording');
      }
      return;
    }

    st.chunks.push(f);
    st.totalMs += dur;
    if (loud) {
      if (st.silence >= 1000) st.longPauses++;
      st.silence = 0; st.voiced += dur; st.speechMs = st.totalMs;
    } else st.silence += dur;
    if (st.silence >= silenceMs || st.totalMs >= maxMs) finalize();
  };

  const init = useCallback(async () => {
    if (!browserSupportsVoice()) throw new Error('This browser cannot do live voice practice. Please use a recent version of Chrome, Edge or Safari.');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) { throw new Error(friendlyMediaError(e, 'microphone')); }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'cap');
    const mute = ctx.createGain();
    mute.gain.value = 0; // keeps the graph running without playing the mic back
    src.connect(node); node.connect(mute); mute.connect(ctx.destination);
    node.port.onmessage = (e) => onChunk.current(e.data);
    if (ctx.state === 'suspended') await ctx.resume();

    Object.assign(s.current, { stream, ctx, src, node, sampleRate: ctx.sampleRate, noise: 0.008, active: false, preroll: [], chunks: [] });
    stream.getAudioTracks()[0]?.addEventListener('ended', () => setStatus('idle'));
  }, []);

  const close = useCallback(() => {
    const st = s.current;
    st.active = false;
    try { st.node?.disconnect(); st.src?.disconnect(); } catch { /* ignore */ }
    st.stream?.getTracks().forEach((t) => t.stop());
    st.ctx?.close().catch(() => {});
    s.current = { active: false };
    setStatus('idle');
  }, []);

  useEffect(() => close, [close]);

  /** "I'm done" button: end the turn now instead of waiting for silence. */
  const finishNow = useCallback(() => { if (s.current.active && s.current.speaking) finalize(); }, []);

  return { status, level, init, listen, hold, close, finishNow };
}
