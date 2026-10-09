const LABELS = {
  communication: 'Communication', confidence: 'Confidence', clarity: 'Clarity', grammar: 'Grammar',
  sentenceStructure: 'Sentence structure', relevance: 'Relevance', answerStructure: 'Answer structure', technicalCorrectness: 'Technical accuracy',
};

export default function FeedbackReport({ report, onAgain, onHome }) {
  const { stats = {}, scores = {} } = report;
  const entries = Object.entries(LABELS).filter(([k]) => typeof scores[k] === 'number');
  const fillerTotal = (stats.fillers || []).reduce((n, f) => n + f.count, 0);
  return (
    <div className="report">
      <div className="report-inner">
        <header className="report-head">
          <div className="ring" style={{ '--p': `${report.overallScore || 0}%` }}><span>{report.overallScore ?? '–'}</span></div>
          <div>
            <h1>{report.scoreLabel || 'Your session review'}</h1>
            <p>{report.summary}</p>
          </div>
        </header>

        <div className="chips">
          {stats.wpm && <span className="chip">{stats.wpm} words per minute</span>}
          <span className="chip">{stats.answers} answers</span>
          <span className="chip">{stats.longPauses} long pauses</span>
          <span className="chip">{fillerTotal} filler words</span>
        </div>
        {report.paceNote && <p className="note">{report.paceNote}</p>}

        {entries.length > 0 && (
          <section>
            <h2>How it breaks down</h2>
            <div className="bars">
              {entries.map(([k, label]) => (
                <div className="bar" key={k}>
                  <span>{label}</span>
                  <div className="bar-track"><i style={{ width: `${scores[k] * 10}%` }} /></div>
                  <b>{scores[k]}/10</b>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="two">
          <section><h2>What you did well</h2><ul>{(report.wentWell || []).map((t, i) => <li key={i}>{t}</li>)}</ul></section>
          <section><h2>What to work on</h2><ul>{(report.improve || []).map((t, i) => <li key={i}>{t}</li>)}</ul></section>
        </div>

        {stats.fillers?.length > 0 && (
          <section>
            <h2>Filler words I heard</h2>
            <div className="chips">{stats.fillers.map((f) => <span className="chip chip--warm" key={f.word}>"{f.word}" × {f.count}</span>)}</div>
            <p className="note">A pause is better than a filler. Next time, try staying quiet for a second instead.</p>
          </section>
        )}

        {report.betterAnswers?.length > 0 && (
          <section>
            <h2>Ways to say it more clearly</h2>
            {report.betterAnswers.map((b, i) => (
              <div className="better" key={i}>
                <p className="q">{b.question}</p>
                <p><span className="tag">You said</span>{b.yourAnswer}</p>
                <p><span className="tag tag--good">Try</span>{b.tryThis}</p>
              </div>
            ))}
          </section>
        )}

        {report.englishNotes?.length > 0 && (
          <section>
            <h2>Small English tweaks</h2>
            <ul>{report.englishNotes.map((n, i) => <li key={i}>"{n.said}" → "{n.better}"</li>)}</ul>
          </section>
        )}

        {report.nextStep && <p className="next">{report.nextStep}</p>}
        <div className="report-actions">
          <button className="btn btn--primary" onClick={onAgain}>Practice again</button>
          <button className="btn" onClick={onHome}>Back home</button>
        </div>
      </div>
    </div>
  );
}
