import { expect, test } from '@playwright/test';

for (const type of ['Study', 'Chat']) {
  test(`${type} room invites work from the pass and room header`, async ({ page, browser, context, baseURL }) => {
    const name = `${type} invite verification`;
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
    await page.goto('/');
    await page.locator('#hero-create-room').click();
    if (type === 'Chat') await page.getByRole('button', { name: /Chat Room/ }).click();
    await page.locator('#room-name').fill(name);
    await page.locator('#create-room-submit').click();
    const code = (await page.locator('.voucher-code-digits').innerText()).trim();
    const url = new URL('/?room=' + code, baseURL).href;
    async function checkCopy() {
      await page.evaluate(() => navigator.clipboard.writeText(''));
      await page.getByRole('button', { name: 'Copy invite link', exact: true }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(url);
    }
    await checkCopy();
    await page.locator('#enter-room-btn').click();
    await page.setViewportSize({ width: 360, height: 800 });
    await checkCopy();
    const invite = await page.evaluate(() => navigator.clipboard.readText());
    const guest = await browser.newPage();
    try {
      await guest.goto(invite);
      await guest.getByRole('button', { name: 'Enter Room' }).click();
      await expect(guest.getByRole('heading', { name, exact: true })).toBeVisible();
      for (const member of [guest, page]) {
        await member.getByRole('button', { name: 'Room menu' }).click();
        await member.getByRole('menuitem', { name: 'Leave Room' }).click();
      }
    } finally {
      await guest.close();
    }
  });
}
