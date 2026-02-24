import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App Setup ---
const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', true);

// Allow cross-origin requests when the frontend is hosted separately
// (e.g. GitHub Pages). Set CORS_ORIGIN to the frontend URL in production.
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({
    origin: corsOrigin.split(',').map(o => o.trim()),
    credentials: true,
  }));
}

app.use(express.json({ limit: '20mb' }));

// --- Gemini API Proxy ---
app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }
  const { prompt, imageData, mimeType } = req.body;
  if (!prompt || !imageData || !mimeType) {
    return res.status(400).json({ error: 'Missing required fields: prompt, imageData, mimeType' });
  }
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageData } }
          ]
        }
      ]
    });
    res.json({ text: result.text ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gemini API error' });
  }
});

// --- OpenAI API Proxy ---
app.post('/api/openai', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server' });
  }
  const { prompt, imageData, mimeType } = req.body;
  if (!prompt || !imageData || !mimeType) {
    return res.status(400).json({ error: 'Missing required fields: prompt, imageData, mimeType' });
  }
  if (mimeType === 'application/pdf') {
    return res.status(400).json({ error: 'OpenAI Vision does not support PDF files. Use an image (JPG/PNG) instead.' });
  }
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } }
        ]}],
        max_tokens: 4096
      })
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error?.message || `OpenAI API error (${resp.status})`);
    res.json({ text: json.choices?.[0]?.message?.content ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'OpenAI API error' });
  }
});

// --- Vite Middleware (Dev) or Static Files (Prod) ---
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
