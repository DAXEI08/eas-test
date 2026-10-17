import { launch, openGame, seedHistory, geometry, diffGeometry, closeGame, VIEWPORTS } from './lib.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch();
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const underlayDiff = (a, c) => diffGeometry(a, c, 0.5, ['.hist', '.hist h2', '.hl']);
const drawerState = page => page.$eval('#hist', h => {
  const r = h.getBoundingClientRect(), cs = getComputedStyle(h), t = document.querySelector('#hToggle');
  return {
    open: h.classList.contains('is-open'),
    hidden: h.getAttribute('aria-hidden'),
    inert: h.hasAttribute('inert'),
    expanded: t.getAttribute('aria-expanded'),
    visibility: cs.visibility,
    pointerEvents: cs.pointerEvents,
    x: r.x, y: r.y, w: r.width, h: r.height,
    vw: innerWidth, vh: innerHeight
  };
});

for (const [name, vp] of Object.entries(VIEWPORTS)) {
  console.log(`\n# ${name}`);
  const { page, errors } = await openGame(b, vp); await seedHistory(page); await settle(page);

  const base = await geometry(page);
  const s0 = await drawerState(page);
  ok(!s0.open && s0.hidden === 'true' && s0.inert && s0.expanded === 'false', 'initially closed and inaccessible');
  ok(s0.visibility === 'hidden' && s0.pointerEvents === 'none', 'closed drawer is not visible or hit-testable');
  ok(await page.$eval('#hCount', e => Number(e.textContent) === document.querySelectorAll('#hList .hi').length), 'trigger count matches rendered history');

  // Opening is an overlay operation: the board, controls and document footprint do not move.
  await page.$eval('#hToggle', e => e.click()); await settle(page);
  const opened = await geometry(page), s1 = await drawerState(page);
  const dOpen = underlayDiff(base, opened);
  ok(dOpen.length === 0, `open: underlying layout unchanged: ${dOpen.slice(0, 5).join('; ')}`);
  ok(s1.open && s1.hidden === 'false' && !s1.inert && s1.expanded === 'true', 'open state/ARIA synchronized');
  ok(s1.visibility === 'visible' && s1.pointerEvents !== 'none', 'open drawer is visible and interactive');
  ok(s1.x < s1.vw && s1.x + s1.w > 0 && s1.y < s1.vh && s1.y + s1.h > 0, 'open drawer is inside the viewport');
  ok(await page.evaluate(() => document.activeElement?.id === 'hClose'), 'opening moves focus to the close button');

  // Explicit close restores the trigger and the exact underlying geometry.
  await page.click('#hClose'); await settle(page);
  const closed = await geometry(page), s2 = await drawerState(page);
  const dClose = underlayDiff(base, closed);
  ok(dClose.length === 0, `close: underlying layout unchanged: ${dClose.slice(0, 5).join('; ')}`);
  ok(!s2.open && s2.hidden === 'true' && s2.inert && s2.expanded === 'false', 'close state/ARIA synchronized');
  ok(await page.evaluate(() => document.activeElement?.id === 'hToggle'), 'close button restores focus to trigger');

  // History keeps recording while closed and the count updates without opening the drawer.
  const n0 = await page.$$eval('#hList .hi', n => n.length);
  const c0 = await page.$eval('#hCount', e => Number(e.textContent));
  await page.click('#bPass'); await settle(page);
  const n1 = await page.$$eval('#hList .hi', n => n.length);
  const c1 = await page.$eval('#hCount', e => Number(e.textContent));
  ok(n1 === n0 + 1 && c1 === c0 + 1, `closed history records and count updates (${n0}/${c0} -> ${n1}/${c1})`);
  ok(!(await drawerState(page)).open, 'new history does not auto-open the drawer');

  // Outside interaction closes the drawer but the original game action still executes.
  await page.$eval('#hToggle', e => e.click()); await settle(page);
  const beforeOutside = await page.$$eval('#hList .hi', n => n.length);
  await page.click('#bPass'); await settle(page);
  const afterOutside = await page.$$eval('#hList .hi', n => n.length);
  ok(!(await drawerState(page)).open && afterOutside === beforeOutside + 1, 'outside game click closes drawer and still performs its action');

  // Escape closes only the history utility when no native dialog is open.
  await page.$eval('#hToggle', e => e.click()); await settle(page);
  await page.keyboard.press('Escape'); await settle(page);
  ok(!(await drawerState(page)).open, 'Escape closes the drawer');

  ok(errors.length === 0, 'no page errors: ' + errors.join('; '));
  await closeGame(page);
}

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
