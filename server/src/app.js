const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { roomStore } = require('./rooms/RoomStore');

const rawOrigins = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const CLIENT_ORIGINS = rawOrigins.split(',').map((s) => s.trim()).filter(Boolean);

const app = express();

const ALLOWED_ORIGINS = Array.from(new Set([
  ...CLIENT_ORIGINS,
  ...CLIENT_ORIGINS.flatMap((o) => [
    o.replace('localhost', '127.0.0.1'),
    o.replace('127.0.0.1', 'localhost'),
  ]),
]));

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin or null origin (e.g. curl, Postman, same-site scripts)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());


const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomId = req.body.roomId || 'global';
    const dest = path.join(UPLOAD_DIR, roomId);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  },
});

const MAX_FALLBACK_UPLOAD_BYTES = 250 * 1024 * 1024; // 250MB
const upload = multer({
  storage,
  limits: { fileSize: MAX_FALLBACK_UPLOAD_BYTES },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ephemeral file upload endpoint
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 250MB).' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: 'Upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

  const { roomId } = req.body;
  if (roomId) {
    const room = roomStore.getById(roomId);
    if (!room) {
      // Remove uploaded file if room doesn't exist
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ error: 'Room not found' });
    }
  }

  const fileData = {
    fileId: path.parse(req.file.filename).name,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    url: `/api/files/${roomId || 'global'}/${req.file.filename}`,
  };

  res.json({ file: fileData });
  });
});

// Serve uploaded file with streaming & download support
app.get('/api/files/:roomId/:filename', (req, res) => {
  const { roomId, filename } = req.params;
  const filePath = path.join(UPLOAD_DIR, roomId, filename);

  // Security check: path traversal prevention
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  res.sendFile(filePath);
});

// Code execution: proxies to Wandbox sandboxed compiler & runtime (GCC 13.2.0 / C++20, CPython).
// No local eval, exec, or host access — execution is strictly isolated in the cloud sandbox.
const WANDBOX_API = 'https://wandbox.org/api/compile.json';

app.post('/api/run', async (req, res) => {
  const { code, language } = req.body ?? {};

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  if (code.length > 100_000) {
    return res.status(400).json({ error: 'Code too large (max 100 KB).' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    let compiler = 'gcc-13.2.0';
    let options = 'c++20';

    if (language === 'cpp') {
      compiler = 'gcc-13.2.0';
      options = 'c++20';
    } else if (language === 'python') {
      compiler = 'cpython-3.12.7';
      options = '';
    } else {
      clearTimeout(timeout);
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    const payload = {
      code,
      compiler,
      ...(options ? { options } : {}),
    };

    const wandboxRes = await fetch(WANDBOX_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!wandboxRes.ok) {
      throw new Error(`Execution service returned status ${wandboxRes.status}`);
    }

    const result = await wandboxRes.json();
    const status = parseInt(result.status, 10);
    const exitCode = isNaN(status) ? 0 : status;

    const stdout = result.program_output || '';
    const stderr = (result.compiler_error || result.compiler_message || '') + (result.program_error || '');

    return res.json({
      stdout,
      stderr,
      exitCode,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Code execution timed out (15s limit).' });
    }
    console.error('[run] Execution error:', err.message);
    return res.status(502).json({ error: `Code execution service error: ${err.message}` });
  }
});


module.exports = { app, UPLOAD_DIR };
