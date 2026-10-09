import Cat from '../components/Cat.jsx';
import { browserSupportsVoice } from '../services/audio.js';

const ICONS = {
  friend: <svg viewBox="0 0 24 24"><path d="M4 5h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H9l-4 3v-3a3 3 0 0 1-1-2.2V8a3 3 0 0 1 0-3z" /><path d="M17 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-1 1.7V19l-3-2.5h-3" /></svg>,
  interview: <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" /></svg>,
  camera: <svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="3" /><path d="M16 10.5l5-3v9l-5-3z" /></svg>,
};

const OPTIONS = [
  { mode: 'friend', title: 'Talk to a Friend', sub: 'Have a natural conversation, talk about anything, and practice speaking without pressure.', cta: 'Start Conversation' },
  { mode: 'interview', title: 'Interview Session', sub: 'Practice real interview questions and become more confident answering them.', cta: 'Start Mock Interview' },
  { mode: 'camera', title: 'Camera Practice', sub: 'Practice speeches, presentations, body language and eye contact while seeing yourself.', cta: 'Start Camera Practice' },
];

export default function Home({ onStart }) {
  const ok = browserSupportsVoice();
  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="brand">SpeakUp AI</p>
          <h1>
            Say it out loud.
            <span className="soft">Confidence follows.</span>
          </h1>
          <p className="lede">Just talk. Someone is listening and nobody is judging. Stumble, pause, start again. That is how confidence gets built.</p>
          <ul className="reassure">
            <li>No judging</li>
            <li>Pause as long as you need</li>
            <li>Talk about anything</li>
          </ul>
        </div>
        <div className="hero-art">
          <div className="halo" aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ '--i': i }} />)}
            <div className="hero-cat"><Cat state="happy" /></div>
          </div>
        </div>
      </section>

      {!ok && <p className="warn">This browser can't do live voice practice. Please open SpeakUp in a recent Chrome, Edge or Safari.</p>}

      <section className="doors">
        {OPTIONS.map((o) => (
          <article key={o.mode} className={`door door--${o.mode}`}>
            <div className="door-icon" aria-hidden="true">{ICONS[o.mode]}</div>
            <h2>{o.title}</h2>
            <p>{o.sub}</p>
            <button className="btn btn--door" onClick={() => onStart(o.mode)} disabled={!ok}>{o.cta}</button>
          </article>
        ))}
      </section>
      <p className="foot">You'll be asked for microphone access (and camera access for Camera Practice). Headphones help, but aren't required.</p>
    </div>
  );
}