import { Router } from 'express';
import { synthesize, AppError } from '../services/gemini.js';
import { PERSONAS } from '../services/prompts.js';

const router = Router();

router.post('/speech', async (req, res, next) => {
  try {
    // Browser voice mode: reply with "no content" so the frontend uses its own voice
    if (process.env.TTS_PROVIDER === 'browser') {
      return res.status(204).end();
    }
    const { text, mode = 'friend' } = req.body;
    if (!text || !String(text).trim()) throw new AppError('EMPTY_TEXT', 'Nothing to say.', 400);
    const voice = PERSONAS[mode]?.voice || 'Kore';
    const { data, sampleRate } = await synthesize(String(text).slice(0, 800), voice);
    res.json({ audio: data, sampleRate });
  } catch (e) { next(e); }
});

export default router;