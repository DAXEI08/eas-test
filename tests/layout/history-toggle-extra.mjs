import { launch, openGame, seedHistory, geometry, diffGeometry, closeGame, VIEWPORTS } from './lib.mjs';

const PART = process.argv[2];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch();
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const tog = page => page.$eval('#hToggle', e => e.click());
const state = page => page.$eval('#hist', h => ({
  open: h.classList.contains('is-open'),
  hidden: h.getAttribute('aria-hidden'),
  inert: h.hasAttribute('inert'),
  exp: document.querySelector('#hToggle').getAttribute('aria-expanded')
}));
const underlayDiff = (a, c) => diffGeometry(a, c, 0.5, ['.hist', '.hist h2', '.hl']);
const LEGACY_KEY = 'scrabble.historyVisible';

if (PART === 'a') {
  console.log('# keyboard + accessibility');
  {
    const { page, errors } = await openGame(b, VIEWPORTS['desktop 1366x768']); await seedHistory(page);
    await page.keyboard.press('Shift'); await page.focus('#hToggle');
    ok(await page.$eval('#hToggle', e => document.activeElement === e && e.matches(':focus-visible')), 'toggle is keyboard-focusable with :focus-visible');
    ok(await page.$eval('#hToggle', e => {
      const c = getComputedStyle(e); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 3;
    }), 'toggle has a visible focus ring');
    ok(await page.$eval('#hToggle', e => e.tagName === 'BUTTON' && e.type === 'button' && e.getAttribute('aria-controls') === 'hist'), 'native button controls the drawer');

    await page.keyboard.press('Enter'); await settle(page);
    let s = await state(page);
    ok(s.open && s.hidden === 'false' && !s.inert && s.exp === 'true', 'Enter opens drawer: ' + JSON.stringify(s));
    ok(await page.evaluate(() => document.activeElement?.id === 'hClose'), 'open moves focus to close');

    await page.keyboard.press('Escape'); await settle(page); s = await state(page);
    ok(!s.open && s.hidden === 'true' && s.inert && s.exp === 'false', 'Escape closes drawer: ' + JSON.stringify(s));
    ok(await page.evaluate(() => document.activeElement?.id === 'hToggle'), 'Escape restores focus to trigger');

    const label = await page.$eval('#hToggle', e => e.textContent.includes('سجل الكلمات') && !!document.querySelector('#hCount'));
    ok(label, 'trigger has a persistent text label and count');
    ok(errors.length === 0, 'no errors ' + errors.join('; ')); await closeGame(page);
  }

  console.log('# transient state + legacy storage isolation');
  {
    let { page } = await openGame(b, VIEWPORTS['desktop 1366x768'], { storage: { [LEGACY_KEY]: 'true' } });
    ok(!(await state(page)).open, 'legacy visible preference no longer auto-opens history');
    await tog(page); await settle(page);
    ok(await page.evaluate(k => localStorage.getItem(k), LEGACY_KEY) === 'true', 'opening does not rewrite legacy storage');
    await page.reload({ waitUntil: 'networkidle0' });
    ok(!(await state(page)).open, 'reload always starts with optional history closed');
    await closeGame(page);

    ({ page } = await openGame(b, VIEWPORTS['desktop 1366x768'], { throwingStorage: true }));
    await tog(page); await settle(page); ok((await state(page)).open, 'drawer works when localStorage is unavailable');
    await tog(page); await settle(page); ok(!(await state(page)).open, 'drawer closes again without storage');
    await closeGame(page);
  }

  console.log('# extreme dimension settings keep drawer bounded and underlay stable');
  for (const dims of [
    { historyScale: 1.6, historyHeightScale: 1.6, historyWidthScale: 1.6, buttonScale: 1.6, boardScale: 1.5, rackScale: 0.5 },
    { historyScale: 0.6, historyHeightScale: 0.4, historyWidthScale: 0.6, buttonScale: 0.6, boardScale: 0.5 }
  ]) {
    for (const name of ['portrait-phone 390x844', 'landscape-phone 844x390', 'landscape-tablet 1024x768', 'desktop 1366x768']) {
      const { page } = await openGame(b, VIEWPORTS[name], { storage: { 'scrabble.dims': JSON.stringify(dims) } }); await seedHistory(page); await settle(page);
      const base = await geometry(page); await tog(page); await settle(page); const opened = await geometry(page);
      const diff = underlayDiff(base, opened);
      const rect = await page.$eval('.histPanel', e => { const r = e.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight }; });
      ok(diff.length === 0, `${name}: opening does not reflow underlay: ${diff.slice(0,3).join('; ')}`);
      ok(rect.w > 0 && rect.h > 0 && rect.x >= -1 && rect.y >= -1 && rect.x + rect.w <= rect.vw + 1 && rect.y + rect.h <= rect.vh + 1,
        `${name}: drawer stays within viewport ${JSON.stringify(rect)}`);
      await closeGame(page);
    }
  }
}

if (PART === 'b') {
  console.log('# all themes: drawer remains themed, transient and off-layout');
  for (const theme of ['classic', 'dark', 'emerald', 'desert']) for (const name of ['desktop 1366x768', 'landscape-phone 844x390', 'portrait-phone 390x844']) {
    const { page, errors } = await openGame(b, VIEWPORTS[name], { storage: { 'scrabble.theme': theme } }); await seedHistory(page); await settle(page);
    ok(await page.evaluate(t => document.documentElement.dataset.theme === t, theme), 'theme applied ' + theme);
    const base = await geometry(page);
    await tog(page); await settle(page);
    const opened = await geometry(page), diff = underlayDiff(base, opened);
    const openStyle = await page.$eval('.histPanel', e => {
      const c = getComputedStyle(e); return { bg:c.backgroundColor, border:c.borderTopColor, visible:c.visibility };
    });
    ok(diff.length === 0, `${theme} / ${name}: drawer does not move game layout`);
    ok(openStyle.visible === 'visible' && openStyle.bg !== 'rgba(0, 0, 0, 0)' && openStyle.border !== 'rgba(0, 0, 0, 0)',
      `${theme} / ${name}: drawer surface uses theme tokens`);

    await page.click('#hClose'); await settle(page);
    const closedStyle = await page.$eval('#hist', e => ({ v:getComputedStyle(e).visibility, pe:getComputedStyle(e).pointerEvents }));
    ok(closedStyle.v === 'hidden' && closedStyle.pe === 'none', `${theme} / ${name}: closed drawer leaves no interactive surface`);
    ok(errors.length === 0, `${theme} / ${name}: no page errors: ${errors.join('; ')}`);
    await closeGame(page);
  }
}

console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
