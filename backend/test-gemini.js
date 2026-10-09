import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash']) {
  try {
    const r = await ai.models.generateContent({ model, contents: 'Say hi in 3 words' });
    console.log('OK  ', model, '-', r.text.trim());
  } catch (e) {
    console.log('FAIL', model, '-', String(e.message).slice(0, 200));
  }
}