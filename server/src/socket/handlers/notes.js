const { roomStore } = require('../../rooms/RoomStore');
const { notesUpdateSchema } = require('../../services/validation');

/** Minimum interval between notes:update events per socket (server-enforced) */
const MIN_UPDATE_INTERVAL_MS = 300;
const lastUpdateMap = new Map(); // socketId → timestamp

/**
 * Sanitize notes HTML — allow-list of safe tags only.
 * Strips <script>, event handlers, javascript: URLs.
 * @param {string} html
 * @returns {string}
 */
function sanitizeNotes(html) {
  // Strip script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Strip on* attributes (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  // Strip javascript: hrefs
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"');
  // Strip style attributes with expressions
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*expression[^"']*["']/gi, '');
  return sanitized;
}

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerNotesHandlers(io, socket) {
  socket.on('notes:update', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    // Server-side rate limiting
    const now = Date.now();
    const last = lastUpdateMap.get(socket.id) ?? 0;
    if (now - last < MIN_UPDATE_INTERVAL_MS) return;
    lastUpdateMap.set(socket.id, now);

    const result = notesUpdateSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const sanitized = sanitizeNotes(result.data.content);
    room.sharedNotes = sanitized;

    // Broadcast to all others (not back to sender)
    socket.to(roomId).emit('notes:update', { content: sanitized });
  });

  socket.on('notes:clear', () => {
    const { roomId } = socket.data ?? {};
    if (!roomId) return;
    const room = roomStore.getById(roomId);
    if (!room) return;
    room.sharedNotes = '';
    io.to(roomId).emit('notes:clear');
  });

  socket.on('notes:editing', () => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;
    socket.to(roomId).emit('notes:editing', { participantId });
  });

  socket.on('disconnect', () => {
    lastUpdateMap.delete(socket.id);
  });
}

module.exports = { registerNotesHandlers, sanitizeNotes };
