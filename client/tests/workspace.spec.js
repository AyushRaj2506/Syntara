import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';
async function seed(page) {
  const socket = io('http://127.0.0.1:4011', { transports: ['websocket'] });
  await new Promise(resolve => socket.once('connect', resolve));
  const result = await socket.timeout(5000).emitWithAck('room:create', { name: 'Browser regression', subject: 'General', displayName: 'Tester' });
  await page.addInitScript(({ room, participantToken }) => {
    sessionStorage.setItem('syntara:displayName', 'Tester');
    sessionStorage.setItem(`syntara:session:${room.roomCode}`, participantToken);
  }, result);
  await page.goto(`/room/${result.room.roomCode}`);
  await expect(page.locator('.notes-editor-content')).toBeVisible();
  socket.disconnect();
  return result.room;
}
test('desktop editors, refresh recovery, focus controls, and mobile state preservation', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await expect(page.locator('.notes-editor-content')).toHaveCount(1);
  await expect(page.locator('.chat')).toHaveCount(1);
  await page.locator('.notes-editor-content').fill('Saved notes across refresh');
  await expect(page.locator('.study-notes .sync-status')).toContainText('Saved');
  await page.reload();
  await expect(page.locator('.notes-editor-content')).toContainText('Saved notes across refresh');
  await page.getByRole('button', { name: 'Start Focus', exact: true }).click();
  await page.getByRole('button', { name: 'Pause focus session' }).click();
  await expect(page.getByRole('button', { name: 'Resume focus session' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume focus session' }).click();
  await page.getByRole('button', { name: 'End focus session' }).click();
  await page.getByRole('button', { name: 'New Sprint' }).click();
  await expect(page.getByRole('button', { name: 'Start Focus', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create a Quiz' })).toBeVisible();
  await page.getByRole('tab', { name: 'Code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code editor' }).fill('print("preserved")');
  await expect(page.locator('.code-scratchpad .sync-status')).toContainText('Saved');
  await page.screenshot({ path: 'test-results/workspace-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('navigation', { name: 'Room navigation' }).getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Code editor' })).toHaveValue('print("preserved")');
  await page.getByRole('navigation', { name: 'Room navigation' }).getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.locator('.notes-editor-content')).toContainText('Saved notes across refresh');
  await expect(page.locator('.notes-editor-content')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/workspace-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('notes propagate between peers; concurrent edits preserve a conflict draft', async ({ page, browser }) => {
  const room = await seed(page);
  const peerContext = await browser.newContext(); const peer = await peerContext.newPage();
  await peer.addInitScript(() => sessionStorage.setItem('syntara:displayName', 'Peer'));
  await peer.goto(`http://127.0.0.1:5175/room/${room.roomCode}`);
  await expect(peer.locator('.notes-editor-content')).toBeVisible();
  await page.locator('.notes-editor-content').fill('Shared first edit');
  await expect(peer.locator('.notes-editor-content')).toContainText('Shared first edit');
  await Promise.all([page.locator('.notes-editor-content').fill('Host concurrent draft'), peer.locator('.notes-editor-content').fill('Peer concurrent draft')]);
  await expect.poll(async () => (await page.locator('.sync-status details').count()) + (await peer.locator('.sync-status details').count())).toBeGreaterThan(0);
  const conflicted = await page.locator('.sync-status details').count() ? page : peer;
  await conflicted.locator('.sync-status summary').click();
  await conflicted.getByRole('button', { name: 'Use latest (discard my draft)' }).click();
  await expect(page.locator('.notes-editor-content')).toHaveText(await peer.locator('.notes-editor-content').innerText());
  await peerContext.close();
});
test('landing page and accessible create dialog', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await page.locator('#hero-create-room').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('P2P files arrive once, including empty files; solo uploads use server fallback', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const room = await seed(page);
  const peerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const peer = await peerContext.newPage();
  await peer.addInitScript(() => sessionStorage.setItem('syntara:displayName', 'Peer'));
  await peer.goto(`http://127.0.0.1:5175/room/${room.roomCode}`);
  await expect(peer.locator('.notes-editor-content')).toBeVisible();
  const sendFile = async (name, buffer) => {
    await page.getByRole('button', { name: 'Attach and share file' }).click();
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/plain', buffer });
    await page.getByRole('button', { name: 'Send File', exact: true }).click();
  };
  await sendFile('direct-test.txt', Buffer.from('peer content'));
  await expect(peer.getByRole('link', { name: 'Download direct-test.txt' })).toHaveCount(1, { timeout: 25000 });
  await expect(peer.getByRole('link', { name: 'Download direct-test.txt' })).toHaveAttribute('href', /^blob:/);
  await sendFile('empty-test.txt', Buffer.alloc(0));
  await expect(peer.getByRole('link', { name: 'Download empty-test.txt' })).toHaveCount(1, { timeout: 25000 });
  await peerContext.close();
  await expect(page.locator('.room-top-bar__presence-badge')).toContainText('1 studying');
  await sendFile('fallback-test.txt', Buffer.from('server content'));
  const download = page.getByRole('link', { name: 'Download fallback-test.txt' });
  await expect(download).toHaveAttribute('href', /\/api\/files\//, { timeout: 15000 });
  const response = await page.request.get(await download.getAttribute('href'));
  expect(await response.text()).toBe('server content');
});

test('quiz can start, finish, release workspace tabs, and start again', async ({ page }) => {
  await seed(page);
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click();
  await page.getByPlaceholder('e.g. What is the time complexity of searching in a balanced BST?').fill('2+2?');
  for (const [index, letter] of ['A', 'B', 'C', 'D'].entries()) await page.getByPlaceholder(`Option ${letter}`).fill(String(index + 1));
  await page.getByRole('button', { name: 'Mark option D as correct' }).click();
  await page.getByRole('button', { name: 'Start Quiz' }).click();
  await page.locator('.quiz-opt-card').nth(3).click();
  await expect(page.getByRole('button', { name: 'New quiz' })).toBeVisible();
  await page.getByRole('tab', { name: 'Notes', exact: true }).click();
  await expect(page.locator('.notes-editor-content')).toBeVisible();
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'New quiz' }).click();
  await expect(page.getByRole('heading', { name: 'Create a Quiz' })).toBeVisible();
});
