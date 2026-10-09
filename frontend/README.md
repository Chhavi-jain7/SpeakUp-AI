# SpeakUp AI — Your Voice, Your Confidence

A voice-first practice companion: talk to a friend, run a mock interview, or rehearse a speech on camera. No chat box. You speak, it listens, thinks and answers out loud.

## Run it

You need Node 18+ and a free Gemini key from https://aistudio.google.com/apikey

```bash
# 1. backend
cd backend
cp .env.example .env        # then paste your key into GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:5000

# 2. frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173 in **Chrome or Edge** (localhost counts as secure, so the mic and camera work).

## How the voice loop works

1. The mic is captured with an `AudioWorklet`. A small voice-activity detector adapts to room noise and starts a turn when you speak (it keeps ~0.4s before your first word so nothing is clipped).
2. The turn ends after ~1.4s of silence (2s in interview mode so you can think), or after 90s max. "I'm done speaking" ends it early.
3. The audio is sent to the backend as a 16 kHz WAV. One Gemini call transcribes it **and** writes the reply, with the whole conversation so far as context.
4. The reply is turned into speech with Gemini TTS and played back. If TTS fails, the browser's voice is used.
5. **Echo prevention:** the mic track is disabled while the AI is thinking or speaking. After it finishes, the app waits 0.75s, then re-enables the mic.

## Project layout

```
backend/   server.js · routes/{turn,speech,feedback}.js · services/{gemini,prompts}.js
frontend/  src/{App,pages/Home,pages/Session,components,hooks/useVoiceLoop,services}
```

| Endpoint | Purpose |
|---|---|
| `POST /api/start` | AI's opening line for a mode |
| `POST /api/turn` | audio + history in, transcript + reply out |
| `POST /api/speech` | text in, spoken audio (PCM) out |
| `POST /api/feedback` | session report (scores, fillers, better answers) |

The API key lives only in `backend/.env`, which is git-ignored.

## Notes and limits

- Model names change often. The backend tries `GEMINI_MODEL`, then a few fallbacks, so a retired name won't break it. Set `GEMINI_MODEL` / `GEMINI_TTS_MODEL` in `.env` to pin your own.
- Camera Practice shows your real webcam, but the AI hears you and cannot see you. It won't judge eye contact or posture; use the camera as a mirror.
- Filler-word counts come from the transcript. Gemini sometimes tidies "um" and "uh" despite instructions, so treat counts as a lower bound.
- Pronunciation scoring isn't included; it needs a dedicated speech-assessment service.
