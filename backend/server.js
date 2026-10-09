import 'dotenv/config'; // must stay first so env vars exist before other modules load
import express from 'express';
import cors from 'cors';
import turnRoutes from './routes/turn.js';
import speechRoutes from './routes/speech.js';
import feedbackRoutes from './routes/feedback.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '25mb' })); // base64 WAV for up to ~90s of speech

app.get('/api/health', (_req, res) => res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) }));
app.use('/api', turnRoutes);
app.use('/api', speechRoutes);
app.use('/api', feedbackRoutes);

app.use((err, _req, res, _next) => {
  if (!err.code) console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: { code: err.code || 'SERVER_ERROR', message: err.userMessage || 'Something went wrong on my side. Please try again.' },
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`SpeakUp AI backend on http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) console.warn('Warning: GEMINI_API_KEY is missing. Copy .env.example to .env and add your key.');
});
