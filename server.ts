import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIdx = process.argv.indexOf('--port');
const cliPort =
  portArgIdx !== -1 && process.argv[portArgIdx + 1]
    ? parseInt(process.argv[portArgIdx + 1], 10)
    : null;
const PORT = cliPort || (process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

interface Clip {
  id: string;
  title: string;
  content: string;
  imageData?: string | null;
  syntax: string; // 'plain' | 'markdown' | 'javascript' | 'python' | 'json' | 'html' | 'css' | etc.
  passwordHash?: string;
  salt?: string;
  hasPassword: boolean;
  createdAt: number;
  expiresAt: number | null; // null = never
  burnAfterReading: boolean;
  isReadOnly: boolean;
  viewCount: number;
  lastViewedAt: number | null;
}

const IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

// In-memory clips cache with disk persistence
const clipsMap = new Map<string, Clip>();
const rootDir = fs.existsSync(path.resolve(__dirname, 'index.html'))
  ? path.resolve(__dirname, '..')
  : __dirname;
const DATA_DIR = path.resolve(rootDir, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'clips.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

// Load existing clips
function loadClips() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data: Clip[] = JSON.parse(raw);
      const now = Date.now();
      for (const clip of data) {
        if (!clip.expiresAt || clip.expiresAt > now) {
          clipsMap.set(clip.id.toLowerCase(), clip);
        }
      }
      console.log(`Loaded ${clipsMap.size} valid clips from store.`);
    } catch (err) {
      console.error('Error loading clips from storage:', err);
    }
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function persistClipsDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const activeClips = Array.from(clipsMap.values()).filter(
        c => !c.expiresAt || c.expiresAt > Date.now()
      );
      fs.writeFileSync(DATA_FILE, JSON.stringify(activeClips, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving clips to disk:', err);
    }
  }, 1000);
}

loadClips();

// Periodically clean expired clips (every 30 seconds)
setInterval(() => {
  const now = Date.now();
  let modified = false;
  for (const [id, clip] of clipsMap.entries()) {
    if (clip.expiresAt && clip.expiresAt <= now) {
      clipsMap.delete(id);
      modified = true;
    }
  }
  if (modified) {
    persistClipsDebounced();
  }
}, 30000);

// Password helpers
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

// Generate friendly unique IDs (6-digit numeric or 6-char alphanumeric)
function generateQuickId(): string {
  // Generate random 6-character alphanumeric or 6-digit
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- API Endpoints ---

// Check stats
app.get('/api/stats', (_req, res) => {
  const now = Date.now();
  let activeCount = 0;
  for (const clip of clipsMap.values()) {
    if (!clip.expiresAt || clip.expiresAt > now) {
      activeCount++;
    }
  }
  res.json({ activeClips: activeCount });
});

// Create a new clip
app.post('/api/clips', (req, res) => {
  try {
    const {
      id: customId,
      title = 'Untitled Clip',
      content = '',
      imageData = null,
      password,
      expiresInSeconds,
      burnAfterReading = false,
      isReadOnly = false,
      syntax = 'plain'
    } = req.body;

    const textContent = typeof content === 'string' ? content : '';
    const hasValidText = textContent.trim().length > 0;
    let validImageData: string | null = null;

    if (imageData !== null && imageData !== undefined && imageData !== '') {
      if (typeof imageData !== 'string' || !IMAGE_DATA_URL_REGEX.test(imageData)) {
        res.status(400).json({ error: 'Invalid image format. Supported formats: PNG, JPEG, WebP, GIF.' });
        return;
      }
      if (imageData.length > 12 * 1024 * 1024) {
        res.status(400).json({ error: 'Image size exceeds the 9MB limit.' });
        return;
      }
      validImageData = imageData;
    }

    if (!hasValidText && !validImageData) {
      res.status(400).json({ error: 'Please provide text content or a screenshot image.' });
      return;
    }

    if (textContent.length > 1000000) {
      res.status(400).json({ error: 'Content exceeds 1MB limit.' });
      return;
    }

    let clipId = '';
    if (customId && typeof customId === 'string' && customId.trim()) {
      // Validate custom id: 2-30 chars, alphanumeric with dashes/underscores
      const cleaned = customId.trim().toLowerCase();
      if (!/^[a-z0-9_-]{2,32}$/.test(cleaned)) {
        res.status(400).json({
          error: 'Custom clip ID must be 2 to 32 alphanumeric characters, dashes, or underscores.'
        });
        return;
      }

      // Check if already exists and not expired
      const existing = clipsMap.get(cleaned);
      if (existing && (!existing.expiresAt || existing.expiresAt > Date.now())) {
        res.status(409).json({ error: 'This custom clip ID is already in use. Please choose another.' });
        return;
      }
      clipId = cleaned;
    } else {
      // Generate unique short code
      let attempts = 0;
      do {
        clipId = generateQuickId();
        attempts++;
      } while (clipsMap.has(clipId) && attempts < 10);
    }

    const now = Date.now();
    let expiresAt: number | null = null;

    if (expiresInSeconds && typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
      expiresAt = now + expiresInSeconds * 1000;
    }

    let passwordHash: string | undefined;
    let salt: string | undefined;
    let hasPassword = false;

    if (password && typeof password === 'string' && password.length > 0) {
      salt = crypto.randomBytes(16).toString('hex');
      passwordHash = hashPassword(password, salt);
      hasPassword = true;
    }

    const newClip: Clip = {
      id: clipId,
      title: title.trim().slice(0, 100) || (validImageData && !hasValidText ? 'Screenshot Clip' : 'Untitled Note'),
      content: textContent,
      imageData: validImageData,
      syntax: syntax || 'plain',
      passwordHash,
      salt,
      hasPassword,
      createdAt: now,
      expiresAt,
      burnAfterReading: Boolean(burnAfterReading),
      isReadOnly: Boolean(isReadOnly),
      viewCount: 0,
      lastViewedAt: null,
    };

    clipsMap.set(clipId, newClip);
    persistClipsDebounced();

    res.status(201).json({
      success: true,
      id: clipId,
      title: newClip.title,
      hasImage: Boolean(newClip.imageData),
      hasPassword: newClip.hasPassword,
      burnAfterReading: newClip.burnAfterReading,
      isReadOnly: newClip.isReadOnly,
      createdAt: newClip.createdAt,
      expiresAt: newClip.expiresAt,
      syntax: newClip.syntax,
    });
  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: 'Failed to create clip.' });
  }
});

// Get clip (inspect or retrieve)
app.get('/api/clips/:id', (req, res) => {
  try {
    const rawId = req.params.id?.toLowerCase().trim();
    if (!rawId) {
      res.status(400).json({ error: 'Invalid clip ID.' });
      return;
    }

    const clip = clipsMap.get(rawId);
    if (!clip) {
      res.status(404).json({ error: 'Clip not found or already expired.' });
      return;
    }

    const now = Date.now();
    if (clip.expiresAt && clip.expiresAt <= now) {
      clipsMap.delete(rawId);
      persistClipsDebounced();
      res.status(404).json({ error: 'This clip has expired.', expired: true });
      return;
    }

    // Check password protection
    if (clip.hasPassword) {
      const providedPassword = (req.headers['x-clip-password'] as string) || (req.query.password as string);
      
      if (!providedPassword) {
        // Return public metadata only - do NOT leak content
        res.status(401).json({
          requiresPassword: true,
          id: clip.id,
          title: clip.title,
          createdAt: clip.createdAt,
          expiresAt: clip.expiresAt,
          burnAfterReading: clip.burnAfterReading,
          syntax: clip.syntax,
          viewCount: clip.viewCount,
        });
        return;
      }

      if (!clip.salt || !clip.passwordHash || !verifyPassword(providedPassword, clip.salt, clip.passwordHash)) {
        res.status(403).json({
          requiresPassword: true,
          error: 'Incorrect password. Access denied.',
        });
        return;
      }
    }

    // Password passed (or none needed)
    clip.viewCount += 1;
    clip.lastViewedAt = now;

    // Handle Burn-after-reading:
    const isBurned = clip.burnAfterReading;
    if (isBurned) {
      clipsMap.delete(rawId);
      persistClipsDebounced();
    }

    res.json({
      id: clip.id,
      title: clip.title,
      content: clip.content,
      imageData: clip.imageData || null,
      syntax: clip.syntax,
      hasPassword: clip.hasPassword,
      burnAfterReading: clip.burnAfterReading,
      burned: isBurned,
      isReadOnly: clip.isReadOnly,
      createdAt: clip.createdAt,
      expiresAt: clip.expiresAt,
      viewCount: clip.viewCount,
    });
  } catch (error) {
    console.error('Error fetching clip:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update an existing clip (if allowed and password matches)
app.put('/api/clips/:id', (req, res) => {
  try {
    const rawId = req.params.id?.toLowerCase().trim();
    const clip = clipsMap.get(rawId);
    if (!clip) {
      res.status(404).json({ error: 'Clip not found.' });
      return;
    }

    if (clip.isReadOnly) {
      res.status(403).json({ error: 'This clip is marked as read-only and cannot be modified.' });
      return;
    }

    if (clip.hasPassword) {
      const providedPassword = (req.headers['x-clip-password'] as string) || (req.body.password as string);
      if (!providedPassword || !clip.salt || !clip.passwordHash || !verifyPassword(providedPassword, clip.salt, clip.passwordHash)) {
        res.status(403).json({ error: 'Password required to edit this clip.' });
        return;
      }
    }

    const { content, title, syntax, imageData } = req.body;
    if (typeof content === 'string') {
      clip.content = content;
    }
    if (imageData !== undefined) {
      if (imageData === null || imageData === '') {
        clip.imageData = null;
      } else if (typeof imageData === 'string' && IMAGE_DATA_URL_REGEX.test(imageData)) {
        if (imageData.length > 12 * 1024 * 1024) {
          res.status(400).json({ error: 'Image size exceeds the 9MB limit.' });
          return;
        }
        clip.imageData = imageData;
      } else {
        res.status(400).json({ error: 'Invalid image format.' });
        return;
      }
    }
    if (typeof title === 'string') {
      clip.title = title.trim().slice(0, 100) || clip.title;
    }
    if (typeof syntax === 'string') {
      clip.syntax = syntax;
    }

    persistClipsDebounced();
    res.json({ success: true, id: clip.id, title: clip.title, syntax: clip.syntax });
  } catch (error) {
    console.error('Error updating clip:', error);
    res.status(500).json({ error: 'Failed to update clip.' });
  }
});

// Delete a clip
app.delete('/api/clips/:id', (req, res) => {
  try {
    const rawId = req.params.id?.toLowerCase().trim();
    const clip = clipsMap.get(rawId);
    if (!clip) {
      res.status(404).json({ error: 'Clip not found.' });
      return;
    }

    if (clip.hasPassword) {
      const providedPassword = (req.headers['x-clip-password'] as string) || (req.query.password as string);
      if (!providedPassword || !clip.salt || !clip.passwordHash || !verifyPassword(providedPassword, clip.salt, clip.passwordHash)) {
        res.status(403).json({ error: 'Password required to delete this clip.' });
        return;
      }
    }

    clipsMap.delete(rawId);
    persistClipsDebounced();
    res.json({ success: true, message: 'Clip deleted successfully.' });
  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: 'Failed to delete clip.' });
  }
});

// Raw text view for curl/CLI or direct browser consumption
app.get('/api/clips/:id/raw', (req, res) => {
  try {
    const rawId = req.params.id?.toLowerCase().trim();
    const clip = clipsMap.get(rawId);
    if (!clip) {
      res.status(404).type('text/plain').send('Clip not found or expired.');
      return;
    }

    if (clip.expiresAt && clip.expiresAt <= Date.now()) {
      clipsMap.delete(rawId);
      persistClipsDebounced();
      res.status(404).type('text/plain').send('This clip has expired.');
      return;
    }

    if (clip.hasPassword) {
      const password = (req.query.password as string) || (req.headers['x-clip-password'] as string);
      if (!password || !clip.salt || !clip.passwordHash || !verifyPassword(password, clip.salt, clip.passwordHash)) {
        res.status(403).type('text/plain').send('Password required. Pass ?password=YOUR_PASSWORD');
        return;
      }
    }

    clip.viewCount += 1;
    if (clip.burnAfterReading) {
      clipsMap.delete(rawId);
      persistClipsDebounced();
    }

    res.type('text/plain; charset=utf-8').send(clip.content);
  } catch {
    res.status(500).type('text/plain').send('Error reading clip.');
  }
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.resolve(__dirname, 'index.html'))
      ? __dirname
      : path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ClipShare server running on http://0.0.0.0:${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
  });
}

startServer().catch(err => {
  console.error('Server startup error:', err);
  process.exit(1);
});
