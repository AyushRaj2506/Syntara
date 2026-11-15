const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { io: client } = require('../../client/node_modules/socket.io-client');
const { Server } = require('socket.io');
const { app, UPLOAD_DIR } = require('../src/app');
const { initSocketServer } = require('../src/socket');
const { roomStore } = require('../src/rooms/RoomStore');
const { deleteRoomUploads } = require('../src/rooms/roomUtils');
const { sanitizeNotes } = require('../src/socket/handlers/notes');
let server, io, url;
const clients = [];
const once = (socket, event) => new Promise(resolve => socket.once(event, resolve));
const emit = (socket, event, data) => new Promise((resolve, reject) => socket.timeout(3000).emit(event, data, (err, result) => err ? reject(err) : resolve(result)));
async function connect() {
  const socket = client(url, { transports: ['websocket'], forceNew: true });
  clients.push(socket);
  await once(socket, 'connect');
  return socket;
}
async function create(socket, overrides = {}) {
  return emit(socket, 'room:create', { name: 'Regression room', subject: 'General', displayName: 'Host', ...overrides });
}
before(async () => {
  server = http.createServer(app); io = new Server(server); initSocketServer(io);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  clients.forEach(socket => socket.disconnect());
  for (const room of roomStore.all()) { deleteRoomUploads(room.roomId); roomStore.delete(room.roomId); }
  await new Promise(resolve => io.close(resolve));
});
test('invalid creation is rejected without crashing; full-room duplicate join is idempotent', async () => {
  const host = await connect();
  assert.equal((await emit(host, 'room:create', {})).error.code, 'INVALID_PAYLOAD');
  const { room } = await create(host, { maxParticipants: 2 });
  const peer = await connect();
  await emit(peer, 'room:join', { roomCode: room.roomCode, displayName: 'Peer' });
  assert.ok((await emit(peer, 'room:join', { roomCode: room.roomCode })).room);
});
test('transport loss preserves host identity and document content', async () => {
  const host = await connect();
  const { room, participantToken } = await create(host);
  await emit(host, 'notes:update', { content: '<p>Keep me</p>', revision: 0 });
  host.disconnect();
  await new Promise(resolve => setTimeout(resolve, 30));
  const replacement = await connect();
  const joined = await emit(replacement, 'room:join', { roomCode: room.roomCode, participantToken });
  assert.equal(joined.room.hostId, room.hostId);
  assert.equal(joined.room.sharedNotes, '<p>Keep me</p>');
  assert.equal(Object.keys(joined.room.participants).length, 1);
});
test('notes reject stale revisions and strip unsafe HTML; code clear increments revision', async () => {
  const host = await connect(); await create(host);
  const saved = await emit(host, 'notes:update', { content: '<p>Hello</p><script>alert(1)</script>', revision: 0 });
  assert.equal(saved.state.content, '<p>Hello</p>');
  const conflict = await emit(host, 'notes:update', { content: 'stale', revision: 0 });
  assert.equal(conflict.error, 'CONFLICT');
  assert.equal(conflict.state.content, '<p>Hello</p>');
  assert.ok(!sanitizeNotes('<img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>').includes('javascript:'));
  await emit(host, 'code:update', { code: 'print(1)', language: 'python', revision: 0 });
  assert.equal((await emit(host, 'code:update', { code: '', language: 'python', revision: 1 })).state.code, '');
});
test('uploads require membership, use canonical paths, and expire with the room', async () => {
  const host = await connect(); const { room, participantToken } = await create(host);
  const body = () => { const form = new FormData(); form.append('roomId', '../escape'); form.append('file', new Blob(['test']), 'sample.txt'); return form; };
  assert.equal((await fetch(`${url}/api/upload`, { method: 'POST', body: body() })).status, 401);
  const response = await fetch(`${url}/api/upload`, { method: 'POST', body: body(), headers: { 'X-Room-Code': room.roomCode, Authorization: `Bearer ${participantToken}` } });
  assert.equal(response.status, 200);
  const { file } = await response.json();
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, room.roomId, file.fileId)));
  assert.equal(await (await fetch(url + file.url)).text(), 'test');
  host.emit('room:leave');
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal((await fetch(url + file.url)).status, 404);
  assert.equal(fs.existsSync(path.join(UPLOAD_DIR, room.roomId)), false);
  assert.equal((await fetch(`${url}/api/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'x', language: 'cpp' }) })).status, 401);
});
test('whiteboard final commit bypasses preview throttling and echoes to sender', async () => {
  const host = await connect(); const { room } = await create(host);
  const stroke = { strokeId: crypto.randomUUID(), points: [{ x: .2, y: .2 }], color: '#000000', size: 'M', done: false };
  const final = once(host, 'whiteboard:draw');
  host.emit('whiteboard:draw', stroke);
  host.emit('whiteboard:draw', { ...stroke, done: true });
  assert.equal((await final).done, true);
  assert.equal(roomStore.getById(room.roomId).whiteboardState.length, 1);
});
test('chat preserves literal text, acknowledges retry, and reports rate rejection', async () => {
  const host = await connect(); await create(host);
  const payload = { id: crypto.randomUUID(), text: 'A & B < C' };
  assert.equal((await emit(host, 'chat:send', payload)).message.text, payload.text);
  assert.equal((await emit(host, 'chat:send', payload)).message.id, payload.id);
  let response;
  for (let i = 0; i < 5; i++) response = await emit(host, 'chat:send', { text: 'extra' });
  assert.equal(response.error.code, 'RATE_LIMITED');
});
test('focus pauses, resumes, completes, then resets', async () => {
  const host = await connect(); await create(host);
  let event = once(host, 'focus:start'); host.emit('focus:start', { durationMin: 5 }); await event;
  event = once(host, 'focus:pause'); host.emit('focus:pause');
  assert.equal((await event).focusSession.status, 'PAUSED');
  event = once(host, 'focus:resume'); host.emit('focus:resume'); assert.equal((await event).focusSession.status, 'FOCUSING');
  event = once(host, 'focus:end'); host.emit('focus:end'); assert.equal((await event).focusSession.status, 'COMPLETED');
  event = once(host, 'focus:end'); host.emit('focus:end'); assert.equal((await event).focusSession, null);
});
test('quiz hides answer keys, completes publicly, and retains reconnect results', async () => {
  const host = await connect(); const { room } = await create(host);
  let event = once(host, 'quiz:start');
  host.emit('quiz:start', { questions: [{ questionId: 'one', text: '2+2?', options: ['1', '2', '3', '4'], correctIndex: 3, timerSec: 10 }] });
  assert.equal((await event).quizState.questions[0].correctIndex, undefined);
  event = once(host, 'quiz:results'); host.emit('quiz:submit', { questionIndex: 0, optionIndex: 3 });
  assert.equal((await event).status, 'COMPLETED');
  const snapshot = roomStore.toPublicRoom(roomStore.getById(room.roomId));
  assert.equal(snapshot.quizState._leaderboard[0].score, 100);
  assert.equal(snapshot.quizState.answers, undefined);
});
