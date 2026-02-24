import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

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
