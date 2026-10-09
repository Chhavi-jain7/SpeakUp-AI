import { useCallback, useEffect, useRef, useState } from 'react';
import Cat from '../components/Cat.jsx';
import FeedbackReport from '../components/FeedbackReport.jsx';
import { useVoiceLoop } from '../hooks/useVoiceLoop.js';
import { api, FATAL_CODES } from '../services/api.js';
import { unlockAudio, playPcm, speakBrowser, sleep, countWords, friendlyMediaError } from '../services/audio.js';

const MODES = {
  friend: { title: 'Talk to a Friend', silenceMs: 1400, camera: false },
  interview: { title: 'Mock Interview', silenceMs: 2000, camera: false },
  camera: { title: 'Camera Practice', silenceMs: 1600, camera: true },
};
const STATUS = {
  idle: 'Getting ready…', listening: '🎤 Listening…', recording: '🔴 Recording', thinking: '🧠 Thinking…', speaking: '🔊 Speaking…', paused: '⏸ Mic paused',
};
const CAT_STATE = { idle: 'listening', listening: 'listening', recording: 'listening', thinking: 'thinking', speaking: 'speaking', paused: 'encouraging' };
const TIPS = [
  "You don't have to speak perfectly. You just have to start.",
  'Take your time. A pause is not a failure.',
  'Your confidence grows every time you speak.',
  'Nobody starts as a perfect speaker.',
  "It's okay to make mistakes here.",
  'Speak freely. This is your safe space.',
  "We're practicing, not judging.",
];

export default function Session({ mode, onExit, onRestart }) {
  const cfg = MODES[mode];
  const [phase, setPhase] = useState('starting'); // starting | live | ending | report | error | feedbackError
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [caption, setCaption] = useState('');
  const [heard, setHeard] = useState('');
  const [tip, setTip] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [camMini, setCamMini] = useState(false);
  const [fs, setFs] = useState(false);
  const [report, setReport] = useState(null);

  const history = useRef([]);
  const turns = useRef([]);
  const turnIdx = useRef(0);
  const player = useRef(null);
  const gone = useRef(false);
  const ending = useRef(false);
  const started = useRef(false);
  const camStream = useRef(null);
  const videoRef = useRef(null);
  const rootRef = useRef(null);

  const handleUtterance = useCallback(async ({ audio, mimeType, stats }) => {
    try {
      const res = await api.turn({ mode, audio, mimeType, history: history.current, turnIndex: turnIdx.current, stats });
      if (gone.current || ending.current) return;
      if (res.empty) {
        setNotice("I didn't catch that. Go ahead, I'm listening.");
        voice.listen();
        return;
      }
      setHeard(res.transcript);
      history.current.push({ role: 'user', text: res.transcript }, { role: 'model', text: res.reply });
      turns.current.push({ text: res.transcript, words: countWords(res.transcript), durationSec: stats.durationSec, longPauses: stats.longPauses });
      turnIdx.current++;
      await say(res.reply);
      if (gone.current || ending.current) return;
      if (res.done) { getFeedback(); return; }
      await resume();
    } catch (e) {
      if (gone.current || ending.current) return;
      if (FATAL_CODES.includes(e.code)) { setError(e.message); setPhase('error'); return; }
      setNotice(`${e.message} Please say that again.`);
      await sleep(900);
      if (!gone.current && !ending.current) voice.listen();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const voice = useVoiceLoop({ silenceMs: cfg.silenceMs, onUtterance: handleUtterance });

  async function say(text) {
    setCaption(text);
    voice.hold('thinking'); // mic stays off while the voice is being prepared
    let p;
    try {
      const sp = await api.speech(text, mode);
      if (gone.current || ending.current) return;
      if (!sp) throw new Error('browser voice'); // no cloud audio: use the browser voice
      p = playPcm(sp.audio, sp.sampleRate);
    } catch {
      p = speakBrowser(text); // cloud voice failed or is off: use the browser voice
    }
    voice.hold('speaking');
    player.current = p;
    try { await p.promise; } catch { /* ignore */ }
    player.current = null;
  }

  async function resume() {
    await sleep(750); // let speaker echo die out before the mic opens
    if (!gone.current && !ending.current) voice.listen();
  }

  async function startCamera() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      camStream.current = st;
      setCamOn(true);
    } catch (e) {
      setCamOn(false);
      setNotice(friendlyMediaError(e, 'camera'));
    }
  }
  function stopCamera() {
    camStream.current?.getTracks().forEach((t) => t.stop());
    camStream.current = null;
    setCamOn(false);
  }
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = camOn ? camStream.current : null; }, [camOn]);

  async function getFeedback() {
    if (turns.current.length === 0) {
      setNotice('Say a few things first, then I can review your session.');
      voice.listen();
      return;
    }
    ending.current = true;
    player.current?.stop();
    voice.close();
    setPhase('ending');
    try {
      const rep = await api.feedback({ mode, history: history.current, turns: turns.current });
      if (gone.current) return;
      setReport(rep);
      setPhase('report');
      stopCamera();
    } catch (e) {
      setError(e.message);
      setPhase('feedbackError');
    }
  }

  // open mic, optional camera, then let the AI speak first
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await unlockAudio();
        await voice.init();
        if (cfg.camera) await startCamera();
        const { reply } = await api.start(mode);
        if (gone.current) return;
        history.current.push({ role: 'model', text: reply });
        setPhase('live');
        await say(reply);
        await resume();
      } catch (e) {
        if (gone.current) return;
        setError(e.message || 'Something went wrong while starting. Please try again.');
        setPhase('error');
      }
    })();
    return () => {
      gone.current = true;
      player.current?.stop();
      camStream.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // quiet encouragement now and then, never constant
  useEffect(() => {
    if (phase !== 'live') return;
    let hide;
    const show = (t) => { setTip(t); clearTimeout(hide); hide = setTimeout(() => setTip(''), 7000); };
    const first = setTimeout(() => show(TIPS[1]), 9000);
    const every = setInterval(() => show(TIPS[Math.floor(Math.random() * TIPS.length)]), 50000);
    return () => { clearTimeout(first); clearInterval(every); clearTimeout(hide); };
  }, [phase]);

  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    const on = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen?.().catch(() => {}));
  const leave = () => { if (document.fullscreenElement) document.exitFullscreen(); onExit(); };
  const status = voice.status;
  const fullCam = camOn && !camMini;

  if (phase === 'report' && report) {
    return <FeedbackReport report={report} onAgain={onRestart} onHome={onExit} />;
  }

  return (
    <div ref={rootRef} className={`stage ${fullCam ? 'stage--cam' : ''}`}>
      <video ref={videoRef} className={`cam ${!camOn ? 'cam--off' : camMini ? 'cam--mini' : 'cam--full'}`} autoPlay muted playsInline
        onClick={camMini ? () => setCamMini(false) : undefined} aria-label="Your camera" />
      <div className="scrim" />

      <header className="topbar">
        <button className="ghost" onClick={leave}>✕ Leave</button>
        <p className={`tip ${tip ? 'tip--show' : ''}`}>{tip}</p>
        <div className="tools">
          <button className="ghost" onClick={camOn ? stopCamera : startCamera}>{camOn ? 'Camera off' : 'Camera on'}</button>
          {camOn && <button className="ghost" onClick={() => setCamMini((m) => !m)}>{camMini ? 'Expand camera' : 'Minimize camera'}</button>}
          <button className="ghost" onClick={toggleFs}>{fs ? 'Exit full screen' : 'Full screen'}</button>
          <button className="ghost ghost--solid" onClick={getFeedback} disabled={phase !== 'live'}>Finish and get feedback</button>
        </div>
      </header>

      {!fullCam && (
        <main className="center">
          <div className={`orb orb--${status}`} style={{ '--lvl': voice.level }}>
            <span className="ring r1" /><span className="ring r2" /><span className="core" />
          </div>
          <p className="mode-title">{cfg.title}</p>
        </main>
      )}

      <footer className="bottom">
        <Cat state={CAT_STATE[status] || 'listening'} />
        <div className="speech">
          <div className="status" data-s={status}>
            <span className="meter" style={{ '--lvl': voice.level }}><i /><i /><i /><i /><i /></span>
            {phase === 'starting' ? 'Getting things ready…' : STATUS[status]}
          </div>
          {caption && <p className="caption">{caption}</p>}
          {heard && <p className="heard">You: {heard}</p>}
        </div>
        <div className="actions">
          {status === 'recording' && <button className="btn btn--soft" onClick={voice.finishNow}>I'm done speaking</button>}
          {status === 'speaking' && <button className="btn btn--soft" onClick={() => player.current?.stop()}>Skip</button>}
          {(status === 'listening' || status === 'recording') && <button className="btn btn--soft" onClick={() => voice.hold('paused')}>Pause mic</button>}
          {status === 'paused' && <button className="btn btn--primary" onClick={voice.listen}>Resume</button>}
        </div>
      </footer>

      {notice && <div className="toast" role="status">{notice}</div>}

      {phase === 'ending' && <div className="overlay"><Cat state="happy" /><p>Putting your feedback together…</p></div>}
      {phase === 'error' && (
        <div className="overlay">
          <p className="overlay-msg">{error}</p>
          <div className="row"><button className="btn btn--primary" onClick={onRestart}>Try again</button><button className="btn btn--soft" onClick={leave}>Back home</button></div>
        </div>
      )}
      {phase === 'feedbackError' && (
        <div className="overlay">
          <p className="overlay-msg">{error}</p>
          <div className="row"><button className="btn btn--primary" onClick={getFeedback}>Try again</button><button className="btn btn--soft" onClick={leave}>Back home</button></div>
        </div>
      )}
    </div>
  );
}