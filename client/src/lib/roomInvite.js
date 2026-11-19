export function roomInviteUrl(roomCode) {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('room', roomCode);
  return url.href;
}
