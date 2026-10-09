<div align="center">

# 🎙️ SpeakUp AI

### Your voice, your confidence.

A voice-first practice companion for speaking English, acing interviews and rehearsing speeches.
No chat box. You talk, it listens, and it answers out loud.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini%20API-4285F4?logo=google&logoColor=white)

<!-- Add a screenshot or GIF here: ![SpeakUp AI](docs/screenshot.png) -->

</div>

---

## ✨ What it does

| Mode | What you get |
|---|---|
| 💬 **Talk to a Friend** | A relaxed, natural conversation about anything. It remembers what you said, reacts to how you feel and asks specific follow-ups instead of generic praise. |
| 💼 **Interview Session** | A realistic mock interview. One question at a time, each built on your previous answer, ending with a detailed feedback report. |
| 🎥 **Camera Practice** | Rehearse a speech or presentation while watching yourself on your real webcam, with spoken coaching on what you said. |

**Also included**
- 🎤 **Hands-free turn taking.** The app detects when you stop speaking, so it never cuts you off after a tiny pause.
- 🔇 **No echo.** The microphone is switched off while the AI thinks and speaks, then comes back on by itself.
- 📝 **Feedback report.** Overall score, what went well, what to improve, filler words, speaking pace, long pauses and clearer ways to say your answers.
- 🐱 **A cat companion** that listens, thinks, talks and cheers you on.
- 🌗 **Light and dark themes**, with fullscreen, minimize and exit controls.
- 🛡️ **Friendly errors** for blocked mic or camera, network problems and AI failures.

---

## 🧠 How the voice loop works

```
You speak → silence detected → audio sent to backend → Gemini hears and replies
        → reply spoken aloud (mic OFF) → short pause → mic ON → you speak again
```

1. The microphone is captured as raw audio. A small voice-activity detector adapts to room noise and keeps about 0.4 seconds before your first word, so nothing is clipped.
2. Your turn ends after about 1.4 seconds of silence (2 seconds in interview mode so you can think). A 90 second limit stops endless recording, and an **I'm done speaking** button ends a turn early.
3. The audio goes to the backend as a 16 kHz WAV. One Gemini call transcribes it and writes the reply, using the whole conversation so far.
4. The reply is turned into speech and played back. If cloud speech is off or fails, the browser's own voice takes over.
5. The mic stays disabled during playback, then re-enables after 0.75 seconds.

---

## 🧰 Tech stack

- **Frontend:** React 18, Vite, plain CSS, Web Audio API (AudioWorklet), `getUserMedia`
- **Backend:** Node.js, Express, dotenv, CORS
- **AI:** Google Gemini API through the official `@google/genai` SDK

---

## 🚀 Getting started

You need **Node.js 18+** and a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
# 1. Clone
git clone https://github.com/<your-username>/SpeakUp-AI.git
cd SpeakUp-AI

# 2. Backend
cd backend
cp .env.example .env        # Windows: copy .env.example .env
# open .env and paste your key into GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open **http://localhost:5173** in Chrome or Edge and allow the microphone when asked. `localhost` counts as a secure origin, so the mic and camera work.

> 🔐 Put your key only in `backend/.env`. That file is git-ignored. Never put a real key in `.env.example` or in frontend code.

### Environment variables (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini key (required) | `AIza...` |
| `GEMINI_MODEL` | Preferred text model. The server falls back to others if it is busy | `gemini-3.8-flash` |
| `GEMINI_TTS_MODEL` | Preferred Gemini voice model | `gemini-2.5-flash-preview-tts` |
| `TTS_PROVIDER` | Set to `browser` to use the browser's voice and save quota | `browser` |
| `PORT` | Backend port | `5000` |
| `CLIENT_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |

Restart the backend after editing `.env`.

---

## 🗂️ Project structure

```
SpeakUp-AI/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── turn.js          # /api/start, /api/turn
│   │   ├── speech.js        # /api/speech
│   │   └── feedback.js      # /api/feedback
│   └── services/
│       ├── gemini.js        # SDK calls, retries, model fallback
│       └── prompts.js       # friend / interviewer / coach personalities
└── frontend/
    └── src/
        ├── pages/           # Home, Session
        ├── components/      # Cat, FeedbackReport
        ├── hooks/           # useVoiceLoop (mic, silence detection)
        └── services/        # api.js, audio.js
```

### API

| Endpoint | Purpose |
|---|---|
| `POST /api/start` | The AI's opening line for a mode |
| `POST /api/turn` | Audio and history in, transcript and reply out |
| `POST /api/speech` | Text in, spoken audio out (204 when browser voice is on) |
| `POST /api/feedback` | Session report with scores, fillers and better answers |
| `GET /api/health` | Check the server is running and the key is loaded |

---

## 🛠️ Troubleshooting

| Problem | What to do |
|---|---|
| `503 UNAVAILABLE` | Google's model is busy. The server retries and switches models. Wait a minute and speak again. |
| `429 Too Many Requests` | Free quota used up. Wait, switch to a fresh key from a new Google project, or enable billing. Set `TTS_PROVIDER=browser` to halve usage. |
| `404 ... no longer available` | The model name was retired. Set `GEMINI_MODEL` to a current one from the Gemini docs. |
| Everything fails with `ECONNREFUSED` | The backend crashed. Read the first red error in the backend terminal, fix it and run `npm run dev`. |
| Mic not working | Click the lock icon in the address bar, allow the microphone and reload. Close other apps that use the mic. |
| No sound from the AI | Click once on the page, check that the tab isn't muted and try Chrome or Edge. |
| Quick test of your key | `GET http://localhost:5000/api/health` should return `{"ok":true,"hasKey":true}`. |

---

## ⚠️ Known limits

- Camera Practice shows your real webcam, but the AI **hears** you and cannot **see** you. It does not judge eye contact or posture. Use the camera as a mirror.
- Filler word counts come from the transcript. Gemini sometimes tidies "um" and "uh", so treat the counts as a minimum.
- Pronunciation scoring isn't included yet.
- There are no accounts. Sessions and reports disappear when you refresh the page.

---

## 🗺️ Roadmap

- [ ] Sign in and saved session history
- [ ] Progress charts (filler words, pace over time)
- [ ] Pronunciation feedback
- [ ] Custom interview roles and topics
- [ ] Per-user usage limits for public hosting

---

## 🤝 Contributing

Ideas and pull requests are welcome. Open an issue first for bigger changes.

## 📄 License

Add a license of your choice, for example MIT, in a `LICENSE` file.

<div align="center">

*You don't have to speak perfectly. You just have to start.* 🐱

</div>"# SpeakUp-AI" 
