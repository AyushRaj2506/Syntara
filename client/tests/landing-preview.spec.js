import { test, expect } from '@playwright/test';

test('mobile join dialog stays centered after the entrance animation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Join Room', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Join a room' });
  await dialog.evaluate(async element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await expect(dialog).toBeInViewport({ ratio: 1 });
  const bounds = await dialog.boundingBox();
  expect(Math.abs(bounds.x + bounds.width / 2 - 180)).toBeLessThan(2);
});

test('landing demo completes its cycle and pauses offscreen and for reduced motion', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  const demo = page.locator('.live-demo-section');
  await demo.scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(16000);
  await expect(demo).toContainText('4 Co-learners Active');
  await page.clock.runFor(16000);
  await expect(demo).toContainText('3 Co-learners Active');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute('data-playing', 'false');
  const clock = demo.locator('.live-demo__timer-clock');
  const paused = await clock.innerText();
  await page.clock.runFor(2000);
  await expect(clock).toHaveText(paused);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo.scrollIntoViewIfNeeded();
  await page.clock.runFor(17000);
  await expect(demo).toHaveAttribute('data-playing', 'false');
  await expect(clock).toHaveText('24:38');
  expect(errors).toEqual([]);
});
