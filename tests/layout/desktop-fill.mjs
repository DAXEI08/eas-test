import { launch, openGame, closeGame } from './lib.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch();

const DESKTOPS = {
  '1366x768': { width: 1366, height: 768, deviceScaleFactor: 1 },
  '1920x1080': { width: 1920, height: 1080, deviceScaleFactor: 1 },
  '2560x1440': { width: 2560, height: 1440, deviceScaleFactor: 1 }
};

for (const [name, vp] of Object.entries(DESKTOPS)) {
  console.log(`\n# desktop fill ${name}`);
  const { page, errors } = await openGame(b, vp);
  const g = await page.evaluate(() => {
    const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom }; };
    const app=rect('.app'), board=rect('#board'), side=rect('.side'), players=rect('.players'), ctrls=rect('.ctrls');
    const racks=[...document.querySelectorAll('.rack')].map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height};});
    return { app,board,side,players,ctrls,racks,vw:innerWidth,vh:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight };
  });

  ok(g.app.w >= g.vw - 18, `app uses viewport width: ${g.app.w}/${g.vw}`);
  ok(g.app.x <= 9 && g.app.right >= g.vw - 9, `app reaches both viewport edges: x=${g.app.x}, right=${g.app.right}`);
  ok(g.board.h >= g.vh * .88, `board uses most viewport height: ${g.board.h}/${g.vh}`);
  ok(g.side.w >= 340 && g.side.w > g.board.w * .45, `side column absorbs remaining width: side=${g.side.w}, board=${g.board.w}`);
  ok(g.players.w >= g.side.w - 1 && g.ctrls.w >= g.side.w - 1, 'players and controls fill the side column');
  ok(g.racks.every(r => r.w > 0) && Math.max(...g.racks.map(r=>r.w)) > 250, `desktop racks are not artificially capped: ${g.racks.map(r=>r.w).join(', ')}`);
  ok(g.sw <= g.vw + 1, `no horizontal overflow: ${g.sw}/${g.vw}`);
  ok(errors.length === 0, 'no page errors: ' + errors.join('; '));
  await closeGame(page);
}

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
