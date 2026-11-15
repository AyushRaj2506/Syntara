const sanitizeHtml = require('sanitize-html');
const { registerDocument } = require('./documents');
function sanitizeNotes(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'em', 's', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'hr', 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
function registerNotesHandlers(io, socket) {
  registerDocument(io, socket, 'notes', payload => typeof payload.content === 'string' && payload.content.length <= 500000
    ? { content: sanitizeNotes(payload.content) } : null);
  socket.on('notes:editing', () => {
    if (socket.data.roomId) socket.to(socket.data.roomId).emit('notes:editing', { participantId: socket.data.participantId });
  });
}
module.exports = { registerNotesHandlers, sanitizeNotes };
