import { config } from 'dotenv';
config();

import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json());

// CORS – allow requests from file:// and any localhost
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT =
  'You are Aria, a friendly and concise personal AI assistant. ' +
  'Help users manage tasks, set reminders, and answer general questions. ' +
  'Keep replies short and helpful. Use plain text; avoid markdown formatting.';

// ─── Chat Endpoint ────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: { systemInstruction: SYSTEM_PROMPT },
    });

    const reply = response.text;
    res.json({ reply });
  } catch (error) {
    console.error('Gemini error:', error.message || error);

    // Surface a friendly error message to the frontend
    const status = error?.status || 500;
    const isQuota = error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const friendly = isQuota
      ? 'Rate limit reached — please wait a moment and try again, or upgrade your Gemini API plan.'
      : `AI error: ${error.message || 'Unknown error'}`;

    res.status(status).json({ error: friendly });
  }
});

// ─── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => res.send('Aria server is running ✅'));

app.listen(port, () => {
  console.log(`\n🚀 Aria server running at http://localhost:${port}`);
  console.log(`   Gemini API key: ${process.env.GEMINI_API_KEY ? '✅ loaded' : '❌ NOT SET – check .env'}\n`);
});