const { registerDocument } = require('./documents');
function registerCodeHandlers(io, socket) {
  registerDocument(io, socket, 'code', payload => typeof payload.code === 'string' && payload.code.length <= 100000 && ['python', 'cpp'].includes(payload.language)
    ? { code: payload.code, language: payload.language } : null);
}
module.exports = { registerCodeHandlers };
