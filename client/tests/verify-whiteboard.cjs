const { expect } = require('@playwright/test');

async function verifyWhiteboard(pages) {
  const rows = [0.24, 0.44, 0.64];
  const colors = ['#E8A33D', '#6FBF8B', '#5B8FBF'];
  const boards = pages.map(page => page.locator('.whiteboard-canvas'));
  const openBoard = page => page.getByRole('tab', { name: 'Board', exact: true }).click();
  await Promise.all(pages.map(openBoard));
  const boxes = await Promise.all(boards.map(board => board.boundingBox()));

  // Read rendered pixels, including the drawing user's own live preview.
  async function checkRows(expected) {
    for (const board of boards) {
      await expect.poll(() => board.evaluate((canvas, { rows, colors }) => rows.map((row, i) => {
        const ctx = canvas.getContext('2d');
        const rgba = ctx.getImageData(Math.floor(canvas.width * 0.35), Math.floor(canvas.height * row), 1, 1).data;
        return Array.from(rgba.slice(0, 3)).map(c => c.toString(16).padStart(2, '0')).join('') === colors[i].slice(1).toLowerCase();
      }), { rows, colors }), { timeout: 12000 }).toEqual(expected);
    }
  }

  await Promise.all(pages.map(async (page, i) => {
    const box = boxes[i];
    await page.getByRole('button', { name: 'Color ' + colors[i], exact: true }).click();
    await page.mouse.move(box.x + 0.20 * box.width, box.y + rows[i] * box.height);
    await page.mouse.down();
  }));
  await Promise.all(pages.map((page, i) => page.mouse.move(
    boxes[i].x + 0.65 * boxes[i].width, boxes[i].y + rows[i] * boxes[i].height, { steps: 25 }
  )));
  await checkRows([true, true, true]);
  await Promise.all(pages.map(page => page.mouse.up()));
  await checkRows([true, true, true]);
  await pages[1].getByRole('button', { name: 'Undo', exact: true }).click();
  await checkRows([true, false, true]);
  await pages[2].reload();
  await openBoard(pages[2]);
  await checkRows([true, false, true]);
  console.log('PASS concurrent whiteboard previews, completed strokes, undo and refresh across three browsers');
}

module.exports = { verifyWhiteboard };
