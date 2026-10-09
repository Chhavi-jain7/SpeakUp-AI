import { Router } from 'express';
import { generateJson, toContents, AppError } from '../services/gemini.js';
import { buildSystem, TURN_INSTRUCTION, START_PROMPT, START_INSTRUCTION } from '../services/prompts.js';

const router = Router();
const MODES = ['friend', 'interview', 'camera'];

/** First line from the AI when a session opens. */
router.post('/start', async (req, res, next) => {
  try {
    const { mode } = req.body;
    if (!MODES.includes(mode)) throw new AppError('BAD_MODE', 'Unknown practice mode.', 400);
    const out = await generateJson({
      systemInstruction: buildSystem(mode),
      contents: [{ role: 'user', parts: [{ text: `${START_PROMPT[mode]}\n${START_INSTRUCTION}` }] }],
      temperature: 1,
    });
    res.json({ reply: String(out.reply || '').trim() });
  } catch (e) { next(e); }
});

/** One spoken turn: audio in -> transcript + contextual reply out. Works for all modes. */
router.post('/turn', async (req, res, next) => {
  try {
    const { mode, audio, mimeType = 'audio/wav', history = [], turnIndex = 0, stats } = req.body;
    if (!MODES.includes(mode)) throw new AppError('BAD_MODE', 'Unknown practice mode.', 400);
    if (!audio || audio.length < 3000) return res.json({ empty: true });

    const contents = [
      ...toContents(history),
      { role: 'user', parts: [{ inlineData: { mimeType, data: audio } }, { text: TURN_INSTRUCTION(stats) }] },
    ];
    const out = await generateJson({ contents, systemInstruction: buildSystem(mode, { turnIndex }) });

    const transcript = String(out.transcript || '').trim();
    if (!transcript) return res.json({ empty: true });
    res.json({ transcript, reply: String(out.reply || '').trim(), done: Boolean(out.done) });
  } catch (e) { next(e); }
});

export default router;
