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
app.use(express.json({ limit: '512kb' }));


const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Authenticate before reading multipart input or creating directories.
const { rateLimit } = require('./services/rateLimit');
const uploadLimited = rateLimit(10, 60_000);
const runLimited = rateLimit(20, 60_000);
function requireMember(req, res, next) {
  const code = req.get('X-Room-Code');
  const token = req.get('Authorization')?.replace(/^Bearer /, '');
  const room = code && roomStore.getByCode(code);
  const participant = room && token && roomStore.findParticipantByToken(room.roomId, token);
  if (!room || room.expiresAt <= Date.now() || !participant || participant.status !== 'connected') {
    return res.status(401).json({ error: 'Join an active room before using this service.' });
  }
  req.room = room;
  req.participant = participant;
  next();
}
const MAX_FALLBACK_UPLOAD_BYTES = 250 * 1024 * 1024;
const ROOM_QUOTA = 500 * 1024 * 1024;
const TOTAL_QUOTA = 1024 * 1024 * 1024;
let reservedBytes = 0;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOAD_DIR, req.room.roomId);
    fs.mkdir(dest, { recursive: true }, (err) => cb(err, dest));
  },
  filename: (req, file, cb) => cb(null, uuidv4()),
});
const upload = multer({ storage, limits: { fileSize: MAX_FALLBACK_UPLOAD_BYTES, files: 1, fields: 2, parts: 3 } });
app.get('/health', (_req, res) => res.json({ status: 'ok', revision: process.env.RENDER_GIT_COMMIT || null, timestamp: new Date().toISOString() }));
app.post('/api/upload', requireMember, (req, res) => {
  const room = req.room;
  if (uploadLimited(req.participant.token)) return res.status(429).json({ error: 'Too many uploads. Try again shortly.' });
  const used = room.files.reduce((n, f) => n + f.fileSize, 0);
  const total = roomStore.all().reduce((n, r) => n + r.files.reduce((m, f) => m + f.fileSize, 0), 0);
  if (used + (room.uploadReserved || 0) + MAX_FALLBACK_UPLOAD_BYTES > ROOM_QUOTA || total + reservedBytes + MAX_FALLBACK_UPLOAD_BYTES > TOTAL_QUOTA) {
    return res.status(413).json({ error: 'Temporary storage is full. Try a smaller file later.' });
  }
  reservedBytes += MAX_FALLBACK_UPLOAD_BYTES;
  room.uploadReserved = (room.uploadReserved || 0) + MAX_FALLBACK_UPLOAD_BYTES;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    reservedBytes -= MAX_FALLBACK_UPLOAD_BYTES;
    room.uploadReserved -= MAX_FALLBACK_UPLOAD_BYTES;
  };
  res.once('close', release);
  upload.single('file')(req, res, (err) => {
    release();
    if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'Upload failed (maximum 250 MB).' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!roomStore.getById(room.roomId) || room.expiresAt <= Date.now() || room.participants[req.participant.participantId]?.token !== req.participant.token) {
      fs.unlink(req.file.path, () => {});
      return res.status(410).json({ error: 'Room has ended.' });
    }
    const file = { fileId: req.file.filename, fileName: req.file.originalname, fileSize: req.file.size,
      fileType: req.file.mimetype, url: `/api/files/${room.roomId}/${req.file.filename}` };
    room.files.push(file);
    res.json({ file });
  });
});
// Random file IDs act as scoped download capabilities, valid only while the room lives.
app.get('/api/files/:roomId/:filename', (req, res) => {
  const room = roomStore.getById(req.params.roomId);
  const file = room?.files.find((f) => f.fileId === req.params.filename);
  if (!room || room.expiresAt <= Date.now() || !file) return res.status(404).json({ error: 'File expired or not found.' });
  res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
  const safeMedia = /^(?:image\/(?:png|jpeg|gif|webp|avif)|audio\/(?:mpeg|ogg|wav|webm)|video\/(?:mp4|webm|ogg))$/;
  res.type(safeMedia.test(file.fileType) ? file.fileType : 'application/octet-stream');
  res.download(path.join(UPLOAD_DIR, room.roomId, file.fileId), file.fileName);
});

// Code execution: proxies to Wandbox sandboxed compiler & runtime (GCC 13.2.0 / C++20, CPython).
// No local eval, exec, or host access — execution is strictly isolated in the cloud sandbox.
const WANDBOX_API = 'https://wandbox.org/api/compile.json';

app.post('/api/run', requireMember, async (req, res) => {
  if (runLimited(req.participant.token)) return res.status(429).json({ error: 'Too many runs. Try again shortly.' });
  const { code, language } = req.body ?? {};

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  if (code.length > 100_000) {
    return res.status(400).json({ error: 'Code too large (max 100 KB).' });
  }

  if (language === 'cpp') {
    try { return res.json(await require('./services/cppExecution').executeCpp(code)); }
    catch (err) { console.warn('[run] Primary compiler unavailable:', err.message); }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

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

    if (!wandboxRes.ok) {
      throw new Error(`Execution service returned status ${wandboxRes.status}`);
    }

    const result = await wandboxRes.json();
    clearTimeout(timeout);
    const status = parseInt(result.status, 10);
    const exitCode = isNaN(status) ? 1 : status;

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
      return res.status(504).json({ error: 'Code execution timed out (30s limit).' });
    }
    console.error('[run] Execution error:', err.message);
    return res.status(502).json({ error: `Code execution service error: ${err.message}` });
  }
});


module.exports = { app, UPLOAD_DIR };
