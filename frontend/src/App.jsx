import { useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import Session from './pages/Session.jsx';

export default function App() {
  const [mode, setMode] = useState(null);
  const [run, setRun] = useState(0); // changing the key restarts a session cleanly
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const start = (m) => { setRun((n) => n + 1); setMode(m); };

  return (
    <>
      {mode ? (
        <Session key={run} mode={mode} onExit={() => setMode(null)} onRestart={() => start(mode)} />
      ) : (
        <>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <Home onStart={start} />
        </>
      )}
    </>
  );
}