import { Router } from 'express';
import { generateJson, AppError } from '../services/gemini.js';

const router = Router();

const FILLERS = [
  ['um', /\b(?:um+|umm+)\b/gi],
  ['uh', /\b(?:uh+|er+|erm)\b/gi],
  ['hmm', /\bhm+\b/gi],
  ['like', /\blike\b/gi],
  ['you know', /\byou know\b/gi],
  ['actually', /\bactually\b/gi],
  ['basically', /\bbasically\b/gi],
  ['I mean', /\bi mean\b/gi],
  ['kind of / sort of', /\b(?:kind|sort) of\b/gi],
  ['literally', /\bliterally\b/gi],
];

function measure(turns) {
  const text = turns.map((t) => t.text).join(' ');
  const fillers = FILLERS.map(([word, re]) => ({ word, count: (text.match(re) || []).length }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
  const words = turns.reduce((n, t) => n + (t.words || 0), 0);
  const secs = turns.reduce((n, t) => n + (t.durationSec || 0), 0);
  return {
    answers: turns.length,
    totalWords: words,
    wpm: secs > 5 ? Math.round(words / (secs / 60)) : null,
    longPauses: turns.reduce((n, t) => n + (t.longPauses || 0), 0),
    avgWordsPerAnswer: turns.length ? Math.round(words / turns.length) : 0,
    fillers,
  };
}

router.post('/feedback', async (req, res, next) => {
  try {
    const { mode = 'interview', history = [], turns = [] } = req.body;
    if (!turns.length) throw new AppError('NO_TURNS', 'There is not enough speech yet to review.', 400);

    const stats = measure(turns);
    const label = { interview: 'Interviewer', friend: 'Friend', camera: 'Coach' }[mode] || 'AI';
    const transcript = history.map((h) => `${h.role === 'user' ? 'User' : label}: ${h.text}`).join('\n').slice(0, 24000);
    const kind = mode === 'interview' ? 'mock interview' : mode === 'camera' ? 'speaking/presentation practice' : 'casual conversation practice';

    const prompt = `You are a kind, honest speaking coach reviewing a ${kind}.
The transcript comes from speech recognition, so ignore punctuation and capitalisation. The user is working on English and confidence, so be encouraging and specific. Never be harsh.

MEASURED STATS (already computed, trust them): ${JSON.stringify({ ...stats, fillers: stats.fillers.slice(0, 6) })}

TRANSCRIPT:
${transcript}

Return ONLY this JSON:
{
 "overallScore": integer 0-100,
 "scoreLabel": "short human label such as 'Solid and getting steadier'",
 "summary": "2-3 warm, specific sentences",
 "scores": {"communication":0-10,"confidence":0-10,"clarity":0-10,"grammar":0-10,"sentenceStructure":0-10,"relevance":0-10,"answerStructure":0-10,"technicalCorrectness": 0-10 or null if no technical content},
 "wentWell": ["3-4 specific things, quote their words where useful"],
 "improve": ["3-4 specific, kind, actionable points"],
 "betterAnswers": [{"question":"what was asked","yourAnswer":"short paraphrase of what they said","tryThis":"a clearer, natural spoken version in first person"}],
 "englishNotes": [{"said":"phrase they used","better":"more natural version"}],
 "paceNote": "one sentence about speaking speed, pauses and filler words using the stats",
 "nextStep": "one friendly challenge for the next session"
}
Give up to 3 betterAnswers and up to 4 englishNotes (use [] if none). Scores should be honest but kind.`;

    const report = await generateJson({
      systemInstruction: 'You write supportive, specific speaking feedback and output only valid JSON.',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.5,
    });
    res.json({ ...report, stats });
  } catch (e) { next(e); }
});

export default router;
