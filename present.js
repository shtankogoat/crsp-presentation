/* ЦРСП — презентация по скроллу. Сектор А → Б — карта. Без библиотек. */
(() => {
  const R = document.documentElement, B = document.body;
  const scenes = [...document.querySelectorAll('.sc')].map(sc => ({
    sc, n: +sc.dataset.n || 1, view: sc.querySelector('.slide, .mview'),
    world: sc.querySelector('.mworld'), panels: [...sc.querySelectorAll('.panel')], lit: sc.querySelector('.route .lit'), seen: false, s: -1
  }));

  // задержки появления
  document.querySelectorAll('.slide, .panel').forEach(v => v.querySelectorAll('.in').forEach((el, i) => el.style.setProperty('--i', i)));
  document.querySelectorAll('.grid10 .fc').forEach((el, i) => el.style.setProperty('--i', i));
  document.querySelectorAll('.rows .flip').forEach((el, i) => el.style.setProperty('--i', i));

  let vh, W, H, fit, stops = [], litLen = 0;
  const layout = () => {
    vh = innerHeight;
    const pt = innerWidth / innerHeight < .8; B.classList.toggle('pt', pt);
    W = pt ? 900 : 1600; H = pt ? 1560 : 900;
    fit = Math.min(innerWidth / (W * 1.04), innerHeight / (H * 1.04));
    R.style.setProperty('--fit', fit.toFixed(4));
    scenes.forEach(s => { s.sc.style.setProperty('--n', s.n); });
    scenes.forEach(s => { s.top = s.sc.offsetTop; });
    stops = []; scenes.forEach(s => { for (let k = 0; k < s.n; k++) stops.push(s.top + k * vh); });
    const m = scenes.find(s => s.world);
    if (m) {
      // в портрете панели встают столбиком
      const pos = pt ? [[0, 0], [700, 1800], [0, 3600]] : [[0, 0], [1400, 1000], [2800, 0]];
      m.panels.forEach((p, i) => { p.style.left = pos[i][0] + 'px'; p.style.top = pos[i][1] + 'px'; });
      m.cams = m.panels.map(p => [p.offsetLeft + W / 2, p.offsetTop + H / 2]);
      const path = pt ? `M450 780 C 450 1500, 1150 1500, 1150 2580 S 450 3700, 450 4380` : 'M800 450 C 1300 450, 1500 1450, 2200 1450 S 3100 450, 3600 450';
      m.sc.querySelectorAll('.route path').forEach(p => p.setAttribute('d', path));
      litLen = m.lit.getTotalLength(); m.lit.style.strokeDasharray = litLen + ' ' + litLen;
    }
  };

  // линии карты А → Б
  const drawLinks = () => document.querySelectorAll('.mapw').forEach(w => {
    const svg = w.querySelector('.links'), ns = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '<defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#7fb2ff"/></linearGradient></defs>';
    const bs = [...w.querySelectorAll('.mi.b')], first = {};
    w.querySelectorAll('.mi.a').forEach((a, i) => {
      const b = bs[+a.dataset.to];
      const x1 = a.offsetLeft + a.parentElement.offsetLeft + a.offsetWidth, y1 = a.offsetTop + a.offsetHeight / 2;
      const x2 = b.parentElement.offsetLeft + b.offsetLeft, y2 = b.offsetTop + b.offsetHeight / 2, mx = (x1 + x2) / 2;
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`);
      p.style.setProperty('--i', i); svg.appendChild(p);
      const fl = p.cloneNode(); fl.setAttribute('class', 'flow'); fl.removeAttribute('style'); svg.appendChild(fl);
      const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      [[x1, y1], [x2, y2]].forEach(([cx, cy]) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 6); c.style.setProperty('--i', i); svg.appendChild(c); });
      if (first[a.dataset.to] === undefined) { first[a.dataset.to] = i; b.style.setProperty('--d', i * 140 + 700); b.querySelector('.ok2')?.style.setProperty('--d', i * 140 + 700); }
    });
  });
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const fmt = n => n.toLocaleString('ru-RU');
  const countUp = (el, to, ms) => { const t0 = performance.now(), big = to >= 10000; const f = now => { const t = Math.min(1, (now - t0) / ms); el.textContent = fmt(big ? Math.round(to * ease(t) / 1000) * 1000 : Math.round(to * ease(t))); if (t < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };

  const render = () => {
    const y = scrollY;
    scenes.forEach(s => {
      const r = (y - s.top) / vh;               // 0 … n-1 — сцена стоит; <0 входит; >n-1 уходит
      const off = r < -1.2 || r > s.n + .2;
      if (off !== s.off) { s.off = off; s.sc.classList.toggle('off', off); }   // пауза бесконечных анимаций вне экрана
      if (off) return;
      const ent = cl(-r), ext = cl(r - (s.n - 1));
      s.view.style.setProperty('--z', (-ent * 500 - ext * 500).toFixed(1));
      s.view.style.setProperty('--rx', (ent * 18 - ext * 18).toFixed(2));
      s.view.style.setProperty('--o', (1 - Math.max(ent, ext) * .85).toFixed(3));
      if (!s.seen && r > -.45) { s.seen = true; s.view.classList.add('seen'); s.panels.forEach(p => p.classList.add('seen')); onSeen(s); }
      const st = Math.round(cl(r, 0, s.n - 1));
      if (st !== s.s) { s.s = st; s.view.dataset.s = st; onState(s, st); }
      if (s.world) {                              // камера по карте А → передача → Б
        const p = cl(r / (s.n - 1)) * (s.cams.length - 1), i = Math.min(s.cams.length - 2, Math.floor(p)), t = ease(p - i);
        const [x0, y0] = s.cams[i], [x1, y1] = s.cams[i + 1];
        const dip = 1 - .38 * Math.sin(Math.PI * t);
        const x = x0 + (x1 - x0) * t, yy = y0 + (y1 - y0) * t;
        s.world.style.transform = `translate(${W / 2}px,${H / 2}px) scale(${dip.toFixed(4)}) translate(${-x}px,${-yy}px)`;
        s.lit.style.strokeDashoffset = (litLen * (1 - p / (s.cams.length - 1))).toFixed(1);
        const near = Math.round(p); if (near !== s.near) { s.near = near; s.panels.forEach((pn, k) => pn.classList.toggle('on', k === near)); }
      }
    });
  };
  const onSeen = s => {
    if (s.view.classList.contains('tar')) s.view.querySelectorAll('[data-to]').forEach(el => countUp(el, +el.dataset.to, 1500));
  };
  const onState = (s, st) => {
    if (s.view.classList.contains('st1')) {
      s.view.style.setProperty('--k', st);
      s.view.querySelectorAll('.orb8').forEach((o, i) => { o.classList.toggle('cur', i === st); o.classList.toggle('done', i < st); });
      s.view.querySelectorAll('.mc').forEach((m, i) => { m.classList.toggle('cur', i === st); m.classList.toggle('past', i < Math.min(st, 5)); m.classList.toggle('fut', i > Math.min(st, 5) + 2); });
    }
    if (s.view.classList.contains('gear')) { const e = s.view.querySelector('#spd'); countUp(e, st === 1 ? 140 : 40, 1300); }
    if (s.view.classList.contains('ten')) { const c = s.view.querySelector('#cnt'); if (c) { if (st === 1) countUp(c, 10, 1600); else c.textContent = 0; } }
  };

  // ---------- шаги ----------
  let cur = 0, anim = null, flying = false;
  // во время полёта считаем от цели, иначе — от реального положения страницы
  const base = () => flying ? cur : nearest();
  const nearest = () => stops.reduce((b, v, i) => Math.abs(v - scrollY) < Math.abs(stops[b] - scrollY) ? i : b, 0);
  const go = to => {
    to = cl(to, 0, stops.length - 1); cur = to;
    cancelAnimationFrame(anim);
    const y0 = scrollY, y1 = stops[to], dur = Math.min(1100, 600 + Math.abs(y1 - y0) / vh * 200), t0 = performance.now();
    flying = true;
    const f = now => { const t = cl((now - t0) / dur); scrollTo(0, y0 + (y1 - y0) * ease(t)); if (t < 1) anim = requestAnimationFrame(f); else flying = false; };
    anim = requestAnimationFrame(f);
  };
  let lastWheel = 0, lastTrig = 0;
  addEventListener('wheel', e => {
    e.preventDefault();
    const now = performance.now(), d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const fresh = now - lastWheel > 180 || now - lastTrig > 850; lastWheel = now;
    if (fresh && Math.abs(d) > 2) { lastTrig = now; go(base() + (d > 0 ? 1 : -1)); }
  }, { passive: false });
  let ty = null;
  addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  addEventListener('touchend', e => { if (ty === null) return; const d = ty - e.changedTouches[0].clientY; if (Math.abs(d) > 30) go(base() + (d > 0 ? 1 : -1)); ty = null; });
  addEventListener('keydown', e => {
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(base() + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(base() - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); } else if (k === 'End') { e.preventDefault(); go(stops.length - 1); }
    else if ('fFаА'.includes(k)) document.fullscreenElement ? document.exitFullscreen() : R.requestFullscreen?.();
  });
  addEventListener('resize', () => { layout(); drawLinks(); scrollTo(0, stops[cur]); render(); });
  let rq = 0; addEventListener('scroll', () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; render(); }); }, { passive: true });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  layout(); drawLinks(); scrollTo(0, 0); render();
  document.fonts?.ready.then(drawLinks);
  window.__steps = stops.length;
})();
