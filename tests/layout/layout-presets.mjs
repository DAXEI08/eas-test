import { launch, openGame, closeGame } from './lib.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch();
const presets = ['stacked', 'balanced', 'arena', 'boardFirst', 'tabletop'];
const cases = {
  desktop: { width: 1366, height: 768, deviceScaleFactor: 1 },
  phonePortrait: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  phoneLandscape: { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
};

for (const [device, vp] of Object.entries(cases)) {
  for (const layout of presets) {
    console.log(`\n# ${device} / ${layout}`);
    const storage = { 'scrabble.ui': JSON.stringify({ layout, dims: {} }) };
    const { page, errors } = await openGame(b, vp, { storage });
    const g = await page.evaluate(() => {
      const one = s => { const e=document.querySelector(s),r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:getComputedStyle(e).display}; };
      const panels=[...document.querySelectorAll('.panel')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};});
      return {
        layout: document.documentElement.dataset.layout,
        board: one('#board'), controls: one('.ctrls'), panels,
        sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
        vw: innerWidth, vh: innerHeight
      };
    });
    ok(g.layout === layout, `preset applied: ${g.layout}`);
    ok(g.board.w > 200 && Math.abs(g.board.w - g.board.h) < 1, `board remains square and usable: ${g.board.w}x${g.board.h}`);
    ok(g.controls.w > 0 && g.controls.h > 0 && g.panels.every(p=>p.w>0&&p.h>0), 'controls and both player panels remain laid out');
    ok(g.sw <= g.vw + 2, `no horizontal overflow: ${g.sw}/${g.vw}`);
    ok(errors.length === 0, 'no page errors: ' + errors.join('; '));

    if (device === 'desktop' && layout === 'stacked') {
      ok(g.panels[0].bottom <= g.panels[1].y + 2, 'stacked puts player 1 above player 2');
      ok(Math.abs(g.panels[0].x - g.panels[1].x) < 2 && Math.abs(g.panels[0].w - g.panels[1].w) < 2, 'stacked keeps both player panels in one column');
      ok(g.controls.y >= g.panels[1].bottom - 2, 'stacked puts controls below both player panels');
    }
    if (device === 'desktop' && layout === 'arena') {
      const left = g.panels.some(p => p.right <= g.board.x + 2), right = g.panels.some(p => p.x >= g.board.right - 2);
      ok(left && right, 'arena places players on opposite sides of board');
      ok(g.controls.y >= g.board.bottom - 2, 'arena places controls below central board');
    }
    if (device === 'desktop' && layout === 'boardFirst') {
      ok(g.controls.y >= g.board.bottom - 2, 'board-first places controls directly beneath board');
      ok(g.panels[0].y >= g.controls.bottom - 2 && Math.abs(g.panels[0].y - g.panels[1].y) < 2, 'board-first places players side-by-side below controls');
    }
    if (device === 'desktop' && layout === 'tabletop') {
      ok(g.panels[0].bottom <= g.board.y + 2 && g.panels[1].y >= g.board.bottom - 2, 'tabletop places players above and below board');
      ok(g.controls.x >= g.board.right - 2 || g.controls.right <= g.board.x + 2, 'tabletop keeps controls beside board');
    }
    await closeGame(page);
  }
}

console.log('\n# settings + migration');
{
  const { page, errors } = await openGame(b, cases.desktop, { storage: { 'scrabble.dims': JSON.stringify({ boardScale:.8, buttonGap:13 }) } });
  const migrated = await page.evaluate(() => ({
    old: localStorage.getItem('scrabble.dims'),
    ui: JSON.parse(localStorage.getItem('scrabble.ui')),
    layout: document.documentElement.dataset.layout,
    boardScale: getComputedStyle(document.documentElement).getPropertyValue('--board-scale').trim(),
    gap: getComputedStyle(document.documentElement).getPropertyValue('--btn-gap').trim()
  }));
  ok(migrated.old === null && migrated.ui?.dims?.boardScale === .8 && migrated.ui?.dims?.buttonGap === 13, 'legacy dimensions migrate into unified settings');
  ok(migrated.layout === 'balanced' && migrated.boardScale === '.8' && migrated.gap === '13px', 'migrated values are applied');

  await page.click('#bSettings');
  await page.waitForSelector('#ad[open]');
  ok(await page.$eval('#lyB .lyOpt', n => n.length) === 5, 'settings exposes five layout presets');
  ok(await page.$$eval('#dmB .setRange', n => n.length) === 8, 'settings exposes all eight sizing/spacing controls');
  await page.click('#lyB [data-layout="arena"]');
  const saved = await page.evaluate(() => ({ d:document.documentElement.dataset.layout, u:JSON.parse(localStorage.getItem('scrabble.ui')) }));
  ok(saved.d === 'arena' && saved.u.layout === 'arena', 'layout changes live and persists');
  ok(errors.length === 0, 'settings/migration no page errors: ' + errors.join('; '));
  await closeGame(page);
}

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
