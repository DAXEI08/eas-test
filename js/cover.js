// Cover screen: Latin title, author, and an animated field of randomly drifting Hijaiyah letters.
const LETTERS = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const COLORS = ['#d4af37', '#f6ecd2', '#6f9db0', '#c9757f', '#e8c766'];
const TITLE = ['ARABIC', 'SCRABBLE'];

const sprites = new Map();
function sprite(ch, color) {
  const key = ch + color;
  let c = sprites.get(key);
  if (c) return c;
  const s = 160;
  c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.font = `700 ${s * .6}px ScrabbleMix, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = s * .12; g.fillStyle = color;
  g.fillText(ch, s / 2, s / 2);
  sprites.set(key, c);
  return c;
}

function buildTitle(el) {
  let i = 0;
  el.innerHTML = TITLE.map(w => `<span class="cw" aria-hidden="true">${[...w].map(ch => `<span class="cl" style="--i:${i++}">${ch}</span>`).join('')}</span>`).join('');
}

export function showCover(onPlay) {
  const cover = document.getElementById('cover'), cv = document.getElementById('coverCanvas'), app = document.querySelector('.app');
  const play = document.getElementById('coverPlay'), ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  buildTitle(document.getElementById('coverTitle'));
  document.body.classList.add('coverOn'); app.inert = true; cover.hidden = false;

  let w = 0, h = 0, dpr = 1, k = 1, parts = [], raf = 0, last = 0, running = false;
  const ptr = {x: -1e4, y: -1e4};

  function spawn() {
    const count = Math.max(22, Math.min(56, Math.round(w * h / 21000)));
    parts = Array.from({length: count}, (_, i) => {
      const z = Math.random();
      return {ch: LETTERS[i % LETTERS.length], color: COLORS[Math.random() * COLORS.length | 0], z,
        x: Math.random() * w, y: Math.random() * h, hd: Math.random() * 6.283, sp: (14 + z * 46) * k,
        turn: .5 + Math.random() * 1.3, f: .15 + Math.random() * .45, ph: Math.random() * 6.283,
        rot: Math.random() * 6.283, rv: (Math.random() - .5) * .7, sw: .1 + Math.random() * .3, f2: .3 + Math.random() * .8,
        ex: 0, ey: 0};
    }).sort((a, b) => a.z - b.z);
  }
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = cover.clientWidth; h = cover.clientHeight; k = Math.max(.6, Math.min(1.3, Math.min(w, h) / 700));
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawn(); if (!running || still) draw(0);
  }
  function step(dt, t) {
    for (const p of parts) {
      p.hd += Math.sin(t * p.f + p.ph) * p.turn * dt;     // smooth random wandering
      p.rot += p.rv * dt;
      const dx = p.x - ptr.x, dy = p.y - ptr.y, d = Math.hypot(dx, dy), R = 150 * k;
      if (d < R && d > 1) { const f = (1 - d / R) ** 2 * 900 * dt; p.ex += dx / d * f; p.ey += dy / d * f; }
      const damp = Math.pow(.9, dt * 60); p.ex *= damp; p.ey *= damp;
      p.x += (Math.cos(p.hd) * p.sp + p.ex) * dt; p.y += (Math.sin(p.hd) * p.sp + p.ey) * dt;
      const m = (36 + p.z * 70) * k;
      if (p.x < -m) p.x = w + m; else if (p.x > w + m) p.x = -m;
      if (p.y < -m) p.y = h + m; else if (p.y > h + m) p.y = -m;
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      const sz = (36 + p.z * 70) * k;
      ctx.globalAlpha = (.16 + p.z * .55) * (.82 + .18 * Math.sin(t * p.f2 + p.ph));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(t * p.f2) * p.sw);
      ctx.drawImage(sprite(p.ch, p.color), -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    step(dt, now / 1000); draw(now / 1000);
    raf = requestAnimationFrame(frame);
  }
  function begin() {
    resize();
    if (still) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  cover.addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; });
  cover.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e4; });
  Promise.race([document.fonts.load('700 64px ScrabbleMix', LETTERS.join('')), new Promise(r => setTimeout(r, 1500))]).then(begin, begin);

  play.addEventListener('click', () => {
    play.disabled = true; cover.classList.add('out'); app.inert = false; document.body.classList.remove('coverOn');
    onPlay();
    setTimeout(() => { running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); cover.hidden = true; }, 520);
  }, {once: true});
  play.focus({preventScroll: true});
}
