/* Throne Records — site interactions
   Global layer (runs once): player, crown/dot visualizers, smooth scroll, nav, cursor, transitions.
   Page layer (runs on every page swap): reveals, crate, roster, records, video, gallery, forms.
   Internal links swap <main> in place, so the music never stops between pages. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGSAP && !reduced;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  // Site root as an absolute URL, so persistent parts keep working after the URL changes.
  const ROOT = new URL(($('meta[name="site-root"]') || {}).content || './', location.href);
  const asset = p => new URL(p, ROOT).href;

  const pointer = { x: -9999, y: -9999 };
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  /* =====================================================================
     DOT VISUALIZERS
     ===================================================================== */
  const COLS = 19, ROWS = 14, BAND = 2, GAP = 1;
  const PEAKS = [0, 4.5, 9, 13.5, 18];
  const SPIKE = Array.from({ length: COLS }, (_, c) => {
    let m = 0;
    PEAKS.forEach(p => { m = Math.max(m, 1 - Math.abs(c - p) / 2.2); });
    return 1 + Math.round(9 * m) + (c === 9 ? 1 : 0);
  });
  const inCrown = (c, r) => r < BAND || (r >= BAND + GAP && r < BAND + GAP + SPIKE[c]);
  const NOISE = Array.from({ length: COLS * ROWS }, (_, i) => (Math.sin(i * 91.17) * 43758.5453) % 1);

  const levels = new Float32Array(COLS); // 0..1 audio energy per column, bass in the centre
  let audioEnergy = 0;

  class Canvas2D {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.visible = true; this.progress = 1;
      this.onResize = () => this.resize(); addEventListener('resize', this.onResize); this.resize();
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
        this.io.observe(canvas);
      }
    }
    resize() {
      const r = this.cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      this.w = r.width; this.h = r.height;
      this.cv.width = Math.max(1, r.width * dpr); this.cv.height = Math.max(1, r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout();
    }
    layout() {}
    destroy() { removeEventListener('resize', this.onResize); this.io && this.io.disconnect(); }
  }

  // The logo, rebuilt as an equalizer.
  class Crown extends Canvas2D {
    constructor(canvas, { interactive = false } = {}) { super(canvas); this.interactive = interactive; }
    layout() {
      this.cell = Math.min(this.w / COLS, this.h / ROWS);
      this.ox = (this.w - this.cell * COLS) / 2; this.oy = (this.h - this.cell * ROWS) / 2;
    }
    draw(t) {
      if (!this.visible || !this.w) return;
      const { ctx, cell } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      const rect = this.interactive ? this.cv.getBoundingClientRect() : null;
      const px = rect ? pointer.x - rect.left : -9999, py = rect ? pointer.y - rect.top : -9999;
      const rad = cell * 0.36;
      for (let c = 0; c < COLS; c++) {
        const lvl = levels[c] * ROWS;
        for (let r = 0; r < ROWS; r++) {
          const i = c * ROWS + r;
          if ((r / ROWS) * 0.8 + Math.abs(NOISE[i]) * 0.2 > this.progress) continue;
          let x = this.ox + c * cell + cell / 2, y = this.oy + (ROWS - 1 - r) * cell + cell / 2;
          const crown = inCrown(c, r), hot = r < lvl;
          let a, col, size = rad;
          if (crown) {
            a = 0.78 + 0.22 * Math.sin(t * 0.0022 + c * 0.55 - r * 0.35);
            col = hot ? '#fff1c9' : '#e3ad48'; if (hot) size = rad * 1.12;
          } else if (hot) { a = 0.25 + 0.55 * (1 - r / ROWS); col = '#e3ad48'; size = rad * 0.8; }
          else { a = 0.12; col = '#6b5a3a'; size = rad * 0.55; }
          if (this.interactive) {
            const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), R = cell * 4.2;
            if (d < R) {
              const f = 1 - d / R;
              x += (dx / (d || 1)) * f * cell * 0.55; y += (dy / (d || 1)) * f * cell * 0.55;
              size *= 1 + f * 0.5; a = Math.min(1, a + f * 0.6); if (!crown) col = '#e3ad48';
            }
          }
          ctx.globalAlpha = a; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // A wide dot equalizer for the artist hero; breathes when idle.
  class DotStrip extends Canvas2D {
    layout() { this.cell = 14; this.cols = Math.ceil(this.w / this.cell); this.rows = Math.max(3, Math.floor(this.h / this.cell)); }
    draw(t) {
      if (!this.visible || !this.w) return;
      const { ctx, cell, cols, rows } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      const playing = audioEnergy > 0.02;
      for (let c = 0; c < cols; c++) {
        const u = Math.abs(c / (cols - 1) - 0.5) * 2; // 0 centre → 1 edges
        const li = clamp(9 + Math.round(u * 9) * (c / cols < 0.5 ? -1 : 1), 0, COLS - 1);
        const idle = (0.18 + 0.14 * Math.sin(t * 0.0016 + c * 0.32)) * (1 - u * 0.6);
        const lit = Math.max(idle, levels[li]) * rows;
        for (let r = 0; r < rows; r++) {
          const on = r < lit;
          ctx.globalAlpha = on ? (playing ? 0.9 : 0.5) * (1 - (r / rows) * 0.5) : 0.08;
          ctx.fillStyle = on ? '#e3ad48' : '#6b5a3a';
          ctx.beginPath(); ctx.arc(c * cell + cell / 2, this.h - r * cell - cell / 2, cell * 0.22, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // Dot-matrix world map: land from Natural Earth, three home bases, live arcs between them.
  const MAP_W = 128, MAP_H = 56, LAT_TOP = 78, LAT_SPAN = 136;
  // window onto the world grid: Europe + Africa, where the three bases are
  const VIEW = { c0: 54, c1: 88, r0: 2, r1: 38 };
  const VIEW_W = VIEW.c1 - VIEW.c0, VIEW_H = VIEW.r1 - VIEW.r0;
  const project = (lat, lon) => ({
    x: ((lon + 180) / 360 * MAP_W - VIEW.c0) / VIEW_W,
    y: ((LAT_TOP - lat) / LAT_SPAN * MAP_H - VIEW.r0) / VIEW_H,
  });
  class DotMap extends Canvas2D {
    constructor(canvas, mask, cities) {
      super(canvas);
      this.land = mask.split(',').map(hex => {
        let bits = ''; for (const ch of hex) bits += parseInt(ch, 16).toString(2).padStart(4, '0');
        return bits.slice(-MAP_W);
      });
      this.cities = cities; this.active = null;
    }
    layout() { this.cell = this.w / VIEW_W; }
    draw(t) {
      if (!this.visible || !this.w || !this.land) return;
      const { ctx, cell } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      const rect = this.cv.getBoundingClientRect();
      const px = pointer.x - rect.left, py = pointer.y - rect.top;
      const pulse = 1 + audioEnergy * 2.2;
      const pts = this.cities.map(c => ({ ...c, X: c.x * this.w, Y: c.y * this.h }));
      for (let r = VIEW.r0; r < VIEW.r1; r++) {
        const row = this.land[r];
        for (let c = VIEW.c0; c < VIEW.c1; c++) {
          const land = row[c] === '1';
          const x = (c - VIEW.c0) * cell + cell / 2, y = (r - VIEW.r0) * cell + cell / 2;
          if (!land) { ctx.globalAlpha = 0.07; ctx.fillStyle = '#9a907d'; ctx.beginPath(); ctx.arc(x, y, cell * 0.1, 0, Math.PI * 2); ctx.fill(); continue; }
          let a = 0.3, size = cell * 0.3, col = '#9a907d';
          for (const p of pts) {
            const d = Math.hypot(x - p.X, y - p.Y), R = cell * 3.2 * pulse;
            if (d < R) { const f = 1 - d / R; a = Math.max(a, 0.3 + f * 0.7); col = '#e3ad48'; size = Math.max(size, cell * (0.3 + f * 0.1)); }
          }
          if (finePointer) {
            const d = Math.hypot(x - px, y - py), R = cell * 3;
            if (d < R) { const f = 1 - d / R; a = Math.max(a, 0.3 + f * 0.7); size *= 1 + f * 0.35; col = '#e3ad48'; }
          }
          ctx.globalAlpha = a; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        }
      }
      // arcs between the bases, with a dot travelling along each
      ctx.lineWidth = 1.2;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const mx = (a.X + b.X) / 2, my = (a.Y + b.Y) / 2 - Math.hypot(b.X - a.X, b.Y - a.Y) * 0.35;
        const lit = this.active && (this.active === a.key || this.active === b.key);
        ctx.globalAlpha = lit ? 0.9 : 0.45; ctx.strokeStyle = '#e3ad48';
        ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.quadraticCurveTo(mx, my, b.X, b.Y); ctx.stroke();
        ctx.setLineDash([]);
        const k = ((t * 0.00018) + i / pts.length) % 1;
        const qx = (1 - k) * (1 - k) * a.X + 2 * (1 - k) * k * mx + k * k * b.X;
        const qy = (1 - k) * (1 - k) * a.Y + 2 * (1 - k) * k * my + k * k * b.Y;
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff1c9';
        ctx.beginPath(); ctx.arc(qx, qy, cell * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  let visuals = []; // page-scoped visualizers
  let piles = [];   // page-scoped photo tables (they pulse with the music)
  let lastBeat = -1;
  const loaderCanvas = $('#loaderCrown');
  const loaderCrown = loaderCanvas ? new Crown(loaderCanvas) : { done: true, draw() {} };

  /* =====================================================================
     AUDIO — persistent player feeding the visualizers
     ===================================================================== */
  const TRACKS = [
    { id: 'how-far', title: 'How Far', artist: 'Bros Throne', src: asset('assets/audio/how_far.mp3'), art: asset('assets/img/featured_fet1_1.jpg') },
    { id: 'jesu', title: 'Jesu', artist: 'Bros Throne', src: asset('assets/audio/jesu.mp3'), art: asset('assets/img/featured_fet1_2.jpg') },
  ];
  const audio = $('#audio');
  let current = null, actx = null, analyser = null, freq = null, graphFailed = false;

  function ensureGraph() {
    if (actx || graphFailed) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const node = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.78;
      node.connect(analyser); analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { graphFailed = true; actx = null; analyser = null; }
  }
  function load(track) {
    current = track; audio.src = track.src;
    $('#playerTitle').textContent = track.title;
    $('#playerArtist').textContent = track.artist;
    $('#playerArt').src = track.art;
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: 'Throne Records', artwork: [{ src: track.art, sizes: '600x600' }] }); } catch (e) {}
    }
  }
  function play(id) {
    const track = TRACKS.find(t => t.id === id) || TRACKS[0];
    if (!current || current.id !== track.id) load(track);
    else if (!audio.paused) { audio.pause(); return; }
    ensureGraph();
    if (actx && actx.state === 'suspended') actx.resume();
    stopVideos();
    audio.play().catch(() => toast('Tap play again to start the track.'));
  }
  function nextTrack() {
    const i = current ? TRACKS.indexOf(current) : -1;
    load(TRACKS[(i + 1) % TRACKS.length]); ensureGraph(); audio.play().catch(() => {}); syncUI();
  }
  function syncUI() {
    const playing = !audio.paused && !audio.ended;
    document.body.classList.toggle('is-playing', playing);
    $('#playerIcon use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('#playerToggle').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $$('.listen__item[data-play]').forEach(el => {
      const on = !!current && el.dataset.play === current.id;
      el.classList.toggle('is-current', on);
      const u = $('.listen__state use', el); if (u) u.setAttribute('href', on && playing ? '#i-pause' : '#i-play');
      el.setAttribute('aria-label', `${on && playing ? 'Pause' : 'Play'} ${$('b', el).textContent}`);
    });
    $$('main [data-play]').forEach(el => {
      const on = !!current && el.dataset.play === current.id;
      const host = el.closest('.record, .ap-rec');
      if (host) { host.classList.toggle('is-current', on); host.classList.toggle('is-spinning', on && playing); }
      $$('use', el).forEach(u => {
        if (/#i-(play|pause)$/.test(u.getAttribute('href'))) u.setAttribute('href', on && playing ? '#i-pause' : '#i-play');
      });
    });
    $$('.now-chip').forEach(chip => {
      const on = current && chip.dataset.play === current.id && playing;
      $('small', chip).textContent = on ? 'Now playing · the crown listens' : 'Press play · the crown listens';
    });
  }
  ['play', 'pause', 'ended'].forEach(ev => audio.addEventListener(ev, syncUI));
  audio.addEventListener('ended', nextTrack);

  const fmt = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
  const seek = $('#playerSeek');
  let seeking = false;
  audio.addEventListener('timeupdate', () => {
    if (seeking || !audio.duration) return;
    const p = audio.currentTime / audio.duration;
    seek.value = Math.round(p * 1000); seek.style.setProperty('--p', `${p * 100}%`);
    $('#playerCur').textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => { $('#playerDur').textContent = fmt(audio.duration); });
  seek.addEventListener('input', () => { seeking = true; seek.style.setProperty('--p', `${seek.value / 10}%`); });
  seek.addEventListener('change', () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });
  $('#playerToggle').addEventListener('click', () => play(current ? current.id : 'how-far'));
  $('#playerNext').addEventListener('click', nextTrack);
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-play]');
    if (!el) return;
    if (el.tagName !== 'BUTTON' && e.target.closest('button[data-play]')) return; // inner button handles it
    e.preventDefault(); play(el.dataset.play);
  });
  load(TRACKS[0]);

  function readLevels(t) {
    const playing = !audio.paused;
    if (playing && analyser) {
      analyser.getByteFrequencyData(freq);
      const half = 10, maxBin = Math.floor(freq.length * 0.72);
      let sum = 0;
      for (let b = 0; b < half; b++) {
        const lo = Math.floor(Math.pow(b / half, 1.9) * maxBin);
        const hi = Math.max(lo + 1, Math.floor(Math.pow((b + 1) / half, 1.9) * maxBin));
        let v = 0; for (let k = lo; k < hi; k++) v = Math.max(v, freq[k]);
        v = Math.pow(v / 255, 1.6) * (0.85 + b * 0.05); sum += v;
        levels[9 - b] = lerp(levels[9 - b], v, 0.5);
        if (9 + b < COLS) levels[9 + b] = lerp(levels[9 + b], v, 0.5);
      }
      audioEnergy = lerp(audioEnergy, sum / half, 0.2);
    } else if (playing) {
      // analyser unavailable: a simulated pulse keeps the visual alive
      for (let c = 0; c < COLS; c++) {
        const v = 0.35 + 0.3 * Math.sin(t * 0.008 + c * 0.9) * Math.sin(t * 0.003 + c * 0.4) + 0.25 * Math.max(0, Math.sin(t * 0.0105));
        levels[c] = lerp(levels[c], clamp(v, 0, 1), 0.25);
      }
      audioEnergy = lerp(audioEnergy, 0.45, 0.1);
    } else {
      for (let c = 0; c < COLS; c++) levels[c] = lerp(levels[c], 0, 0.08);
      audioEnergy = lerp(audioEnergy, 0, 0.05);
    }
  }
  function frame(t) {
    readLevels(t);
    visuals.forEach(v => v.draw(t));
    if (!loaderCrown.done) loaderCrown.draw(t);
    const beat = Math.round(audioEnergy * 100) / 100;
    if (beat !== lastBeat) { piles.forEach(pl => pl.style.setProperty('--beat', beat)); lastBeat = beat; }
    document.documentElement.style.setProperty('--glow', (0.55 + audioEnergy * 0.9).toFixed(3));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* =====================================================================
     SMOOTH SCROLL, NAV, MENU
     ===================================================================== */
  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000)); gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    }
  }
  const navH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
  function scrollToTarget(target, immediate) {
    const offset = target === 0 ? 0 : -navH();
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4, immediate: !!immediate, force: true });
    else {
      const y = target === 0 ? 0 : target.getBoundingClientRect().top + scrollY + offset;
      scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
    }
  }

  const nav = $('#nav');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 700 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  }, { passive: true });

  const burger = $('#burger'), menu = $('#menu');
  function openMenu() {
    menu.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open');
    setTimeout(() => { const first = $('.menu__links a', menu); if (first) first.focus({ preventScroll: true }); }, 50);
    lenis && lenis.stop();
    if (animate) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' });
      gsap.from('.menu__links a', { yPercent: 120, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out', delay: 0.25 });
    }
  }
  function closeMenu() {
    if (menu.hidden) return;
    burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open');
    lenis && lenis.start();
    if (animate) gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.55, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } });
    else menu.hidden = true;
  }
  burger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));

  // Listen dropdown: every track in one place
  const listen = $('#listen'), listenBtn = $('#listenBtn'), listenPanel = $('#listenPanel');
  const listenItems = () => $$('.listen__item', listenPanel);
  let durationsLoaded = false;
  function openListen() {
    listenPanel.hidden = false; listenBtn.setAttribute('aria-expanded', 'true');
    const items = listenItems(); const cur = items.find(i => i.classList.contains('is-current')) || items[0];
    cur.focus({ preventScroll: true });
    if (!durationsLoaded) {
      durationsLoaded = true;
      TRACKS.forEach(t => {
        const probe = new Audio(); probe.preload = 'metadata'; probe.src = t.src;
        probe.addEventListener('loadedmetadata', () => { const d = $(`[data-dur="${t.id}"]`, listenPanel); if (d) d.textContent = fmt(probe.duration); });
      });
    }
  }
  function closeListen(refocus) {
    if (listenPanel.hidden) return;
    listenPanel.hidden = true; listenBtn.setAttribute('aria-expanded', 'false');
    if (refocus) listenBtn.focus();
  }
  listenBtn.addEventListener('click', () => (listenPanel.hidden ? openListen() : closeListen()));
  document.addEventListener('pointerdown', e => { if (!listen.contains(e.target)) closeListen(); });
  listen.addEventListener('focusout', e => { if (!listen.contains(e.relatedTarget)) closeListen(); });
  listenPanel.addEventListener('keydown', e => {
    const items = listenItems(), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeListen(true); }
  });
  listenPanel.addEventListener('click', e => { if (e.target.closest('a.listen__item')) closeListen(); });

  /* =====================================================================
     CURSOR, MAGNETIC, FOLLOWERS
     ===================================================================== */
  const cursor = $('#cursor'), cursorLabel = $('#cursorLabel');
  const float = $('#artistFloat'), floatImg = $('#artistFloatImg');
  const peek = $('#showPeek'), peekImg = $('#showPeekImg');
  if (finePointer && !reduced) {
    document.body.classList.add('has-cursor');
    const c = { x: innerWidth / 2, y: innerHeight / 2 }, f = { ...c }, p = { ...c };
    let tilt = 0;
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    const loop = () => {
      const vx = pointer.x - c.x;
      c.x = lerp(c.x, pointer.x, 0.3); c.y = lerp(c.y, pointer.y, 0.3);
      cursor.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      tilt = lerp(tilt, clamp(vx * 0.6, -28, 28), 0.15);
      cursor.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`);
      f.x = lerp(f.x, pointer.x, 0.12); f.y = lerp(f.y, pointer.y, 0.12);
      float.style.transform = `translate3d(${f.x - float.offsetWidth / 2}px, ${f.y - float.offsetHeight / 2}px, 0) rotate(${clamp((pointer.x - f.x) * 0.05, -8, 8)}deg)`;
      p.x = lerp(p.x, pointer.x + 40, 0.16); p.y = lerp(p.y, pointer.y - 110, 0.16);
      peek.style.left = `${p.x}px`; peek.style.top = `${p.y}px`;
      requestAnimationFrame(loop);
    };
    loop();
    addEventListener('pointermove', () => cursor.classList.add('is-on'), { once: true });
    document.addEventListener('pointerover', e => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, label, input, textarea');
      cursor.classList.toggle('has-label', !!lab);
      cursor.classList.toggle('is-link', !lab && !!link);
      cursorLabel.textContent = lab ? lab.dataset.cursor : '';
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    document.addEventListener('pointerenter', () => cursor.classList.add('is-on'));
  }
  function bindMagnetic(scope) {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]', scope).forEach(el => {
      if (el.dataset.magBound) return; el.dataset.magBound = '1';
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.28}px, ${(e.clientY - (r.top + r.height / 2)) * 0.38}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(.2,.7,.1,1)'; el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 500);
      });
    });
  }
  bindMagnetic(document);

  // footer spotlight (persistent)
  const fw = $('.footer__word');
  if (fw) {
    fw.style.setProperty('--fx', '-30%');
    fw.addEventListener('pointermove', e => {
      const r = fw.getBoundingClientRect();
      fw.style.setProperty('--fx', `${((e.clientX - r.left) / r.width) * 100}%`);
      fw.style.setProperty('--fy', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
    fw.addEventListener('pointerleave', () => fw.style.setProperty('--fx', '-30%'));
  }

  /* =====================================================================
     TOAST, COPY, LIGHTBOX, VIDEO
     ===================================================================== */
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy;
    const fallback = () => {
      const range = document.createRange(); range.selectNodeContents(b);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      toast('Selected. Press copy on your keyboard.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}`), fallback);
    else fallback();
  });

  const lightbox = $('#lightbox'), lbImg = $('#lightboxImg'), lbCount = $('#lightboxCount');
  let lbItems = [], lbIndex = 0, lbReturn = null;
  function showLightbox(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const img = lbItems[lbIndex];
    lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt;
    lbCount.textContent = `${String(lbIndex + 1).padStart(2, '0')} / ${String(lbItems.length).padStart(2, '0')}`;
    if (animate) gsap.fromTo(lbImg, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
  }
  function openLightbox(items, i) {
    lbItems = items; lbReturn = document.activeElement; lightbox.hidden = false; lenis && lenis.stop();
    showLightbox(i); $('.lightbox__close').focus();
  }
  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.hidden = true; lenis && lenis.start(); lbReturn && lbReturn.focus();
  }
  const stepLightbox = d => showLightbox(lbIndex + d);
  lightbox.addEventListener('click', e => {
    const act = e.target.closest('[data-lb]');
    if (act) { if (act.dataset.lb === 'close') closeLightbox(); else stepLightbox(act.dataset.lb === 'next' ? 1 : -1); }
    else if (e.target === lightbox) closeLightbox();
  });
  // keep keyboard focus inside an open overlay
  addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const layer = !lightbox.hidden ? lightbox : !menu.hidden ? menu : null;
    if (!layer) return;
    const items = $$('a[href], button:not([hidden])', layer).concat(layer === menu ? [burger] : []);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
    e.preventDefault(); items[next].focus();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMenu(); closeLightbox(); }
    if (!lightbox.hidden && e.key === 'ArrowRight') stepLightbox(1);
    if (!lightbox.hidden && e.key === 'ArrowLeft') stepLightbox(-1);
  });

  // click-to-load video, so YouTube only loads when asked
  function stopVideos() {
    $$('.ap-video__frame.is-playing').forEach(fr => {
      fr.classList.remove('is-playing');
      const ifr = $('iframe', fr); if (ifr) ifr.remove();
      $('.ap-video__play', fr).hidden = false;
    });
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ap-video__play');
    if (!btn) return;
    const fr = btn.closest('[data-video]');
    audio.pause();
    const ifr = document.createElement('iframe');
    ifr.src = `https://www.youtube-nocookie.com/embed/${fr.dataset.video}?autoplay=1&rel=0`;
    ifr.title = fr.dataset.videoTitle || 'Video';
    ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    ifr.allowFullscreen = true;
    fr.appendChild(ifr); fr.classList.add('is-playing'); btn.hidden = true;
    if (!$('.ap-video__out', fr.parentElement)) {
      const link = document.createElement('a');
      link.href = `https://www.youtube.com/watch?v=${fr.dataset.video}`; link.target = '_blank'; link.rel = 'noopener';
      link.className = 'ap-video__out'; link.textContent = 'Video not loading? Open it on YouTube ↗';
      fr.after(link);
    }
  });

  /* =====================================================================
     PAGE LAYER
     ===================================================================== */
  let ctx = null;     // gsap context for the current page
  let cleanups = [];  // other per-page teardown

  function splitWords(el, inner) {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(w => inner
      ? `<span class="w" aria-hidden="true"><span class="wi">${w}</span></span>`
      : `<span class="word" aria-hidden="true">${w}</span>`).join(' ');
  }

  function initPage(main, { first } = {}) {
    const page = main.dataset.page || 'home';
    document.body.dataset.page = page;
    $$('[data-split]', main).forEach(el => splitWords(el, true));
    const scrubEl = $('[data-scrub]', main);
    if (scrubEl) {
      splitWords(scrubEl, false);
      const gold = /^(believers|straight-shooters|storytellers\.?|redefine|define|change|world\.)$/i;
      $$('.word', scrubEl).forEach(w => { if (gold.test(w.textContent.replace(/,/g, ''))) w.classList.add('is-gold'); });
    }

    const heroCanvas = $('#heroCrown', main);
    if (heroCanvas) visuals.push(new Crown(heroCanvas, { interactive: finePointer && !reduced }));
    $$('[data-dotstrip]', main).forEach(cv => visuals.push(new DotStrip(cv)));

    bindMagnetic(main);
    bindRoster(main); bindShows(main); bindTilt(main); bindForms(main); bindClocks(main);
    bindTrail(main); bindPiles(main);
    bindMap(main); bindArchive(main); bindRequest(main); bindTee(main); bindStrip(main); bindDesk(main);

    if (animate) {
      ctx = gsap.context(() => {
        $$('[data-split]', main).forEach(el => {
          gsap.from($$('.wi', el), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });
        if (scrubEl) {
          document.documentElement.classList.add('js-scrub');
          const words = $$('.word', scrubEl);
          ScrollTrigger.create({
            trigger: scrubEl, start: 'top 80%', end: 'bottom 45%', scrub: true,
            onUpdate: self => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-lit', i < n)); },
          });
        }
        const rise = (sel, trig, extra = {}) => {
          const t = $(trig, main); if (!t) return;
          gsap.from($$(sel, main), { y: 50, opacity: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 88%', once: true }, ...extra });
        };
        const zoom = $('.zoom', main);
        if (zoom) {
          const narrow = matchMedia('(max-width: 720px)').matches;
          const tl = gsap.timeline({ scrollTrigger: { trigger: zoom, start: 'top top', end: '+=120%', scrub: 0.6, pin: $('.zoom__pin', zoom), refreshPriority: 2 } });
          tl.fromTo($('.zoom__media', zoom), { clipPath: narrow ? 'inset(26% 14% 26% 14% round 6px)' : 'inset(22% 30% 22% 30% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut' }, 0)
            .fromTo($('.zoom__media img', zoom), { scale: 1.25 }, { scale: 1, ease: 'power2.out' }, 0)
            .to($('.zoom__line--l', zoom), { x: () => -innerWidth * 0.35, ease: 'power2.in' }, 0)
            .to($('.zoom__line--r', zoom), { x: () => innerWidth * 0.35, ease: 'power2.in' }, 0)
            .to($$('.zoom__line', zoom), { opacity: 0, duration: 0.3 }, 0.55);
        }
        if (page === 'home') {
          rise('.manifesto__facts > div', '.manifesto__facts');
          rise('.artist-row', '.artist-list');
          rise('.show', '.show-list');
          rise('.tilt', '.wear__cards', { y: 80 });
          rise('.city', '.cities');
          gsap.to('.hero__word', { scale: 0.9, yPercent: -12, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
          gsap.to('.hero__crown', { yPercent: -30, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
          gsap.fromTo('.feature__cover', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: true } });
          gsap.fromTo('.feature__disc', { xPercent: -30 }, { xPercent: 0, ease: 'power2.out', scrollTrigger: { trigger: '.feature', start: 'top 80%', end: 'center center', scrub: true } });
        } else if (page === 'shows') {
          rise('.chip', '.chips', { y: 20 });
          rise('.arc', '.arc-list');
          rise('.ticket-wrap', '.ticket-wrap', { y: 80 });
        } else if (page === 'contact') {
          rise('.direct li', '.direct', { y: 24 });
          rise('.desk-tab', '.desk-tabs', { y: 30 });
          rise('.city', '.cities');
          rise('.follow-row', '.follow-list');
        } else if (page === 'wear') {
          rise('.studio__controls > *', '.studio__controls', { y: 30 });
          rise('.look', '.mood__strip', { y: 80 });
          gsap.fromTo('.wear-hero__a', { yPercent: 0 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.pg-hero', start: 'top top', end: 'bottom top', scrub: true } });
          gsap.fromTo('.wear-hero__b', { yPercent: 0 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.pg-hero', start: 'top top', end: 'bottom top', scrub: true } });
        } else {
          rise('.ap-facts div', '.ap-facts');
          rise('.ap-bio p', '.ap-bio');
          rise('.ap-rec', '.ap-rec-list');
          rise('.ap-links li', '.ap-links');
          gsap.fromTo('.ap-hero__img img', { yPercent: 0 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.ap-hero', start: 'top top', end: 'bottom top', scrub: true } });
          gsap.fromTo('.ap-video__frame', { clipPath: 'inset(10% 6% 10% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.ap-video', start: 'top 90%', end: 'top 35%', scrub: true } });
        }
      }, main);
    }
    // pinned sections are measured first (refreshPriority, top to bottom) so every trigger after
    // them sees the extra scroll length they add; then all triggers are re-sorted and re-measured
    bindCrate(main);
    if (hasGSAP) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }
    syncUI();
    dispatchEvent(new Event('throne:page'));
    if (!first) introPage(main);
  }

  function teardownPage() {
    if (ctx) { ctx.revert(); ctx = null; }
    cleanups.forEach(fn => fn()); cleanups = [];
    visuals.forEach(v => v.destroy()); visuals = []; piles = [];
    float.classList.remove('is-on'); peek.classList.remove('is-on');
    stopVideos(); closeLightbox();
  }

  // entrance for the page's hero
  function introPage(main) {
    if (!animate) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (['shows', 'wear', 'contact'].includes(main.dataset.page)) {
      tl.from($$('.ap-line > span', main), { yPercent: 110, duration: 1.2, stagger: 0.08 })
        .from($$('.pg-hero .eyebrow, .pg-lede, .pg-hero .ap-actions', main), { y: 24, opacity: 0, duration: 1, stagger: 0.07 }, 0.3)
        .from($$('.map, .wear-hero__a, .wear-hero__b, .direct', main), { opacity: 0, y: 40, duration: 1.4, stagger: 0.12 }, 0.2)
        .from($$('.badge', main), { scale: 0, duration: 1.2, ease: 'back.out(1.6)' }, 0.7);
    } else if (main.dataset.page === 'artist') {
      tl.from($$('.ap-line > span', main), { yPercent: 110, duration: 1.2, stagger: 0.08 })
        .from($('.ap-hero__img', main), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0)
        .from($('.ap-hero__img img', main), { scale: 1.3, duration: 1.6 }, 0)
        .from($$('.ap-back, .ap-hero .eyebrow, .ap-lede, .ap-actions', main), { y: 24, opacity: 0, duration: 1, stagger: 0.07 }, 0.3);
    } else {
      tl.from($$('.hero__letters span', main), { yPercent: 105, duration: 1.3, stagger: 0.06 })
        .from($('.hero__sub', main), { opacity: 0, letterSpacing: '0.2em', duration: 1.2 }, 0.4)
        .from($$('.hero .reveal-up', main), { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, 0.6);
      const crown = visuals.find(v => v instanceof Crown);
      if (crown) tl.from(crown, { progress: 0, duration: 1.6, ease: 'power2.out' }, 0);
    }
  }

  /* ---------- page binders ---------- */

  // Shows map: pins positioned from lat/lon, clicking filters the archive.
  function bindMap(main) {
    const el = $('[data-map]', main);
    if (!el) return;
    const pins = $$('.map__pin', el);
    const cities = pins.map(p => ({ key: p.dataset.city, ...project(+p.dataset.lat, +p.dataset.lon) }));
    pins.forEach((p, i) => { p.style.setProperty('--x', `${cities[i].x * 100}%`); p.style.setProperty('--y', `${cities[i].y * 100}%`); });
    const map = new DotMap($('.map__canvas', el), el.dataset.mask, cities);
    visuals.push(map);
    pins.forEach(p => p.addEventListener('click', () => {
      main.dispatchEvent(new CustomEvent('throne:filter', { detail: p.dataset.city }));
      const archive = $('#archive', main);
      if (archive) scrollToTarget(archive);
    }));
    main.addEventListener('throne:filtered', e => {
      map.active = e.detail === 'all' ? null : e.detail;
      pins.forEach(p => p.classList.toggle('is-active', p.dataset.city === e.detail));
    });
  }

  // Archive: country filter chips + expanding rows.
  function bindArchive(main) {
    const list = $('.arc-list', main);
    if (!list) return;
    const rows = $$('.arc', list), chips = $$('[data-filter]', main);
    const count = $('[data-archive-count]', main), empty = $('[data-archive-empty]', main);
    const names = { all: '', nigeria: ' in Nigeria', russia: ' in Russia', uk: ' in the UK' };
    const apply = key => {
      let n = 0;
      rows.forEach(r => { const show = key === 'all' || r.dataset.country === key; r.classList.toggle('is-hidden', !show); if (show) n++; });
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === key)));
      count.textContent = `${n} ${n === 1 ? 'show or drop' : 'shows and drops'}${names[key] || ''}`;
      empty.hidden = n > 0;
      main.dispatchEvent(new CustomEvent('throne:filtered', { detail: key }));
      if (animate) gsap.fromTo(rows.filter(r => !r.classList.contains('is-hidden')), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'expo.out' });
      if (hasGSAP) ScrollTrigger.refresh();
    };
    chips.forEach(c => c.addEventListener('click', () => apply(c.dataset.filter)));
    main.addEventListener('throne:filter', e => apply(e.detail));
    rows.forEach(r => {
      const btn = $('.arc__row', r);
      btn.addEventListener('click', () => {
        const open = !r.classList.contains('is-open');
        r.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
        peek.classList.remove('is-on');
        if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 650);
      });
    });
  }

  // City request: a ticket that fills itself in as you type.
  function bindRequest(main) {
    const form = $('#requestForm', main);
    if (!form) return;
    const city = $('#rqCity', main), email = $('#rqEmail', main), msg = $('#requestMsg', main);
    const ticket = $('[data-ticket]', main), tCity = $('[data-ticket-city]', main), tWho = $('[data-ticket-who]', main), tCode = $('[data-ticket-code]', main);
    const boxes = $$('input[name="rqArtist"]', form);
    const code = str => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 9973; return `TR-${String(h).padStart(4, '0')}`; };
    const bump = () => { ticket.classList.remove('is-bump'); void ticket.offsetWidth; ticket.classList.add('is-bump'); };
    const update = () => {
      const c = city.value.trim();
      tCity.textContent = c || 'Your city';
      const who = boxes.filter(b => b.checked).map(b => b.value);
      tWho.textContent = who.length === 0 || who.length === boxes.length ? 'The whole roster' : who.join(' + ');
      tCode.textContent = code(c.toLowerCase() + who.join());
    };
    city.addEventListener('input', update);
    boxes.forEach(b => b.addEventListener('change', () => { update(); bump(); }));
    if (finePointer && !reduced) {
      const wrap = ticket.parentElement;
      wrap.addEventListener('pointermove', e => {
        const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        ticket.style.transform = `rotate(-4deg) rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`;
      });
      wrap.addEventListener('pointerleave', () => { ticket.style.transform = ''; });
    }
    form.addEventListener('submit', e => {
      e.preventDefault();
      let err = '';
      if (!city.value.trim()) err = 'Add your city so we know where to come.';
      else if (!emailOk(email.value.trim())) err = 'Enter an email like name@example.com.';
      msg.classList.toggle('is-error', !!err);
      msg.textContent = err || `Prototype: your request for ${city.value.trim()} is ready to send once the form is wired up. Nothing was sent.`;
      if (!err) bump();
    });
    update();
  }

  // Tee designer: colour + prints, drag to turn, flip button.
  function bindTee(main) {
    const tee = $('[data-tee]', main);
    if (!tee) return;
    const form = $('#teeForm', main), side = $('[data-tee-side]', main), summary = $('[data-tee-summary]', main), msg = $('#teeMsg', main);
    const label = (name) => { const r = $(`input[name="${name}"]:checked`, form); return r ? $(`label[for="${r.id}"]`, form).textContent.trim() : ''; };
    let rot = 0, tilt = 0;
    const render = (smooth = true) => {
      tee.style.transition = smooth ? 'transform .9s cubic-bezier(.2,.7,.1,1)' : 'none';
      tee.style.transform = `rotateX(${tilt}deg) rotateY(${rot}deg)`;
      const back = Math.round(((rot % 360) + 360) % 360 / 180) % 2 === 1;
      side.textContent = back ? 'Back' : 'Front';
    };
    const sync = () => {
      tee.dataset.colour = ($('input[name="teeColour"]:checked', form) || {}).value || 'ink';
      tee.dataset.front = ($('input[name="teeFront"]:checked', form) || {}).value || 'none';
      tee.dataset.back = ($('input[name="teeBack"]:checked', form) || {}).value || 'none';
      summary.textContent = `${label('teeColour')} tee · front: ${label('teeFront')} · back: ${label('teeBack')}`;
      msg.textContent = '';
    };
    form.addEventListener('change', e => {
      sync();
      // show the side that just changed
      if (e.target.name === 'teeBack' && Math.abs(Math.round(rot / 180)) % 2 === 0) { rot += 180; render(); }
      if (e.target.name === 'teeFront' && Math.abs(Math.round(rot / 180)) % 2 === 1) { rot += 180; render(); }
    });
    $('[data-tee-flip]', main).addEventListener('click', () => { rot += 180; render(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      msg.classList.remove('is-error');
      msg.textContent = `Prototype: your vote for the ${summary.textContent.toLowerCase()} would be counted here. Nothing was sent.`;
    });
    // drag to spin, snap to a side on release
    let drag = null;
    tee.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, rot }; tee.setPointerCapture(e.pointerId); tee.classList.add('is-dragging');
    });
    tee.addEventListener('pointermove', e => {
      if (drag) { rot = drag.rot + (e.clientX - drag.x) * 0.6; render(false); return; }
      if (finePointer && !reduced) {
        const r = tee.getBoundingClientRect();
        tilt = ((e.clientY - r.top) / r.height - 0.5) * -10;
        tee.style.transition = 'transform .4s ease-out';
        tee.style.transform = `rotateX(${tilt}deg) rotateY(${rot + ((e.clientX - r.left) / r.width - 0.5) * 16}deg)`;
      }
    });
    const end = () => {
      if (!drag) return;
      const moved = Math.abs(rot - drag.rot) > 4;
      drag = null; tee.classList.remove('is-dragging');
      rot = moved ? Math.round(rot / 180) * 180 : rot + 180; // a tap turns it around
      render();
    };
    tee.addEventListener('pointerup', end);
    tee.addEventListener('pointercancel', end);
    tee.addEventListener('pointerleave', () => { if (!drag) { tilt = 0; render(); } });
    sync(); render(false);
  }

  // Mouse drag-to-scroll for sideways rows (touch already swipes natively).
  // Returns a function that tells whether the last press was a drag, so clicks can be ignored.
  function dragScroll(el, { skip = () => false, onDrag = () => {} } = {}) {
    let down = null, dragged = false;
    if (!finePointer) return () => false;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || skip()) return;
      down = { x: e.clientX, left: el.scrollLeft }; dragged = false;
    });
    const move = e => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 5 && !dragged) { dragged = true; el.classList.add('is-dragging'); onDrag(); }
      if (dragged) el.scrollLeft = down.left - dx;
    };
    const up = () => { if (!down) return; down = null; setTimeout(() => el.classList.remove('is-dragging'), 0); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
    cleanups.push(() => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); });
    el.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    return () => dragged;
  }

  // Moodboard strip: drag to scroll, loupe on hover, tap opens full size.
  function bindStrip(main) {
    const strip = $('[data-strip]', main);
    if (!strip) return;
    const looks = $$('.look', strip);
    const isDragging = dragScroll(strip, { onDrag: () => looks.forEach(l => l.classList.remove('is-zoom')) });
    looks.forEach((look, i) => {
      const frame = $('.look__frame', look), lens = $('.look__lens', look), img = $('img', look);
      if (finePointer && !reduced) {
        look.addEventListener('pointermove', e => {
          if (strip.classList.contains('is-dragging')) return;
          const r = frame.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, Z = 2.4;
          if (x < 0 || y < 0 || x > r.width || y > r.height) { look.classList.remove('is-zoom'); return; }
          look.classList.add('is-zoom');
          lens.style.left = `${x - 75}px`; lens.style.top = `${y - 75}px`;
          lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
          lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
          lens.style.backgroundPosition = `${-(x * Z - 75)}px ${-(y * Z - 75)}px`;
        });
        look.addEventListener('pointerleave', () => look.classList.remove('is-zoom'));
      }
      look.addEventListener('click', () => { if (!isDragging()) openLightbox($$('.look img', strip), i); });
    });
  }

  // Contact desks: tabs switch the form, the letter writes itself, sending seals the envelope.
  function bindDesk(main) {
    const form = $('#deskForm', main);
    if (!form) return;
    const tabs = $$('.desk-tab', main), groups = $$('.desk__group', form), letter = $('[data-letter]', main);
    const f = id => $('#' + id, form), msg = $('#deskMsg', main);
    const L = k => $(`[data-l-${k}]`, main);
    const fmtDate = v => v ? new Date(v + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    L('date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let desk = 'booking';
    const re = () => {
      const picks = $$('input[name="dkArtist"]:checked', form).map(b => b.value);
      switch (desk) {
        case 'booking': {
          const who = picks.length ? picks.join(' + ') : 'the roster';
          const where = f('dkCity').value.trim(), when = fmtDate(f('dkDate').value);
          return `Booking ${who}${where ? ' in ' + where : ''}${when ? ', ' + when : ''}`;
        }
        case 'demo': return f('dkStage').value.trim() ? `A demo from ${f('dkStage').value.trim()}` : 'A demo for the label';
        case 'press': return `Press${f('dkOutlet').value.trim() ? ' · ' + f('dkOutlet').value.trim() : ' enquiry'}${f('dkDeadline').value ? ' · due ' + fmtDate(f('dkDeadline').value) : ''}`;
        case 'wear': return `Throne Wear · ${($('input[name="dkWear"]:checked', form) || {}).value || 'Capsule 01'}`;
        default: return f('dkSubject').value.trim() || 'Hello from a fan';
      }
    };
    const render = () => {
      L('re').textContent = re();
      const body = f('dkMsg').value.trim();
      const extra = desk === 'demo' && f('dkLink').value.trim() ? `\n\nListen: ${f('dkLink').value.trim()}` : '';
      L('body').textContent = body ? `Dear Throne Records,\n\n${body}${extra}` : `Dear Throne Records,${extra}`;
      L('name').textContent = f('dkName').value.trim() || 'Your name';
      L('email').textContent = f('dkEmail').value.trim() || 'you@example.com';
    };
    const select = (key, focus) => {
      const tab = tabs.find(t => t.dataset.desk === key) || tabs[0];
      desk = tab.dataset.desk;
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      form.setAttribute('aria-labelledby', tab.id);
      groups.forEach(g => { g.hidden = g.dataset.for !== desk; });
      $('[data-desk-to]', main).textContent = tab.dataset.to;
      L('desk').textContent = $('.desk-tab__l', tab).textContent;
      msg.textContent = '';
      const strip = tab.parentElement;
      if (strip.scrollWidth > strip.clientWidth + 1) strip.scrollTo({ left: tab.offsetLeft - strip.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
      if (focus) tab.focus({ preventScroll: true });
      render();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t.dataset.desk));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length].dataset.desk, true); }
      });
    });
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    // ?desk=booking&artist=bros-throne preselects
    const fromQuery = () => {
      const q = new URLSearchParams(location.search);
      if (q.get('artist')) { const box = f('dk-' + q.get('artist')); if (box) box.checked = true; }
      select(q.get('desk') || 'booking');
    };
    addEventListener('throne:query', fromQuery);
    cleanups.push(() => removeEventListener('throne:query', fromQuery));
    fromQuery();

    form.addEventListener('submit', e => {
      e.preventDefault();
      let err = '';
      if (!f('dkName').value.trim()) err = 'Add your name so we know who to reply to.';
      else if (!emailOk(f('dkEmail').value.trim())) err = 'Enter an email like name@example.com.';
      else if (desk === 'demo' && !/^https?:\/\/\S+\.\S+/.test(f('dkLink').value.trim())) err = 'Add a link to your music, starting with https://';
      else if (f('dkMsg').value.trim().length < 10) err = 'Tell us a little more in the message.';
      msg.classList.toggle('is-error', !!err);
      if (err) { msg.textContent = err; return; }
      const to = $('[data-desk-to]', main).textContent;
      msg.textContent = '';
      letter.classList.add('is-sending');
      setTimeout(() => letter.classList.add('is-flying'), reduced ? 0 : 1300);
      setTimeout(() => {
        msg.textContent = `Prototype: your letter to ${to} is sealed and ready to send once the form is wired up. Nothing was sent.`;
        letter.classList.remove('is-flying', 'is-sending');
      }, reduced ? 50 : 2400);
    });
  }

  // Photo trail: pictures drop where the pointer travels.
  function bindTrail(main) {
    const zone = $('[data-trail]', main);
    if (!zone || reduced) return;
    const layer = $('.trail__layer', zone);
    const srcs = layer.dataset.images.split(/\s+/).filter(Boolean).map(p => new URL(p, location.href).href);
    srcs.forEach(src => { const im = new Image(); im.src = src; });
    let last = null, idx = 0, z = 1;
    const spawn = (x, y) => {
      const img = document.createElement('img');
      img.className = 'trail__img'; img.alt = ''; img.src = srcs[idx++ % srcs.length];
      img.style.zIndex = z++;
      layer.appendChild(img);
      const w = img.offsetWidth || 180, h = w * 1.25, rot = (Math.random() - 0.5) * 18;
      const at = (dy, sc) => `translate(${x - w / 2}px, ${y - h / 2 + dy}px) rotate(${rot}deg) scale(${sc})`;
      img.animate([
        { transform: at(0, 0.3), opacity: 0 },
        { transform: at(0, 1), opacity: 1, offset: 0.22 },
        { transform: at(0, 1), opacity: 1, offset: 0.6 },
        { transform: at(40, 0.8), opacity: 0 },
      ], { duration: 1400, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'forwards' }).onfinish = () => img.remove();
      while (layer.children.length > 16) layer.firstChild.remove();
    };
    const point = e => { const r = zone.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    zone.addEventListener('pointermove', e => {
      const p = point(e);
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > (e.pointerType === 'touch' ? 55 : 95)) { spawn(p.x, p.y); last = p; }
    });
    zone.addEventListener('pointerdown', e => { const p = point(e); spawn(p.x, p.y); last = p; });
    zone.addEventListener('pointerleave', () => { last = null; });
  }

  // Photo table: prints you can drag, throw, shuffle and tidy.
  function bindPiles(main) {
    $$('[data-pile]', main).forEach(pile => {
      const cards = $$('.pile__card', pile);
      if (!cards.length) return;
      piles.push(pile);
      const st = cards.map(() => ({ x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0 }));
      const section = pile.closest('section') || main;
      const tidyBtn = $('[data-pile-tidy]', section), shuffleBtn = $('[data-pile-shuffle]', section);
      let top = cards.length, tidy = false;

      // st[i] is where a print lives on the table; `deal.p` (0 → 1, driven by scroll) blends
      // each print from a stack in the middle out to that spot, so scrolling back gathers them up.
      const deal = { p: 0 };
      const K = 0.06; // stagger between prints
      const stackR = cards.map(() => (Math.random() - 0.5) * 10);
      const dealt = i => { const e = clamp(deal.p * (1 + (cards.length - 1) * K) - i * K, 0, 1); return 1 - Math.pow(1 - e, 3); };
      const size = i => ({ cw: cards[i].offsetWidth, ch: cards[i].offsetHeight });
      const apply = i => {
        const c = st[i], e = dealt(i), { cw, ch } = size(i);
        const x = lerp((pile.clientWidth - cw) / 2, c.x, e), y = lerp((pile.clientHeight - ch) / 2 + (cards.length - i) * -2, c.y, e);
        cards[i].style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${lerp(stackR[i], c.r, e)}deg) scale(${c.s * lerp(0.92, 1, e)})`;
      };
      const applyAll = () => cards.forEach((_, i) => apply(i));
      const scatter = () => cards.map((_, i) => {
        const { cw, ch } = size(i);
        return { x: Math.random() * Math.max(0, pile.clientWidth - cw), y: Math.random() * Math.max(0, pile.clientHeight - ch), r: (Math.random() - 0.5) * 26 };
      });
      const grid = () => {
        const { cw, ch } = size(0), gap = 16, W = pile.clientWidth;
        const colsN = Math.max(2, Math.floor((W + gap) / (cw + gap))), rowsN = Math.ceil(cards.length / colsN);
        // grow the table so a tidy grid never overlaps
        pile.style.height = '';
        const need = rowsN * (ch + gap) - gap;
        if (need > pile.clientHeight) pile.style.height = `${need}px`;
        const H = pile.clientHeight;
        const stepY = ch + gap;
        const x0 = (W - (colsN * cw + (colsN - 1) * gap)) / 2;
        const y0 = Math.max(0, (H - ((rowsN - 1) * stepY + ch)) / 2);
        return cards.map((_, i) => ({ x: x0 + (i % colsN) * (cw + gap), y: y0 + Math.floor(i / colsN) * stepY, r: 0 }));
      };
      const moveTo = (targets, stagger = 0.035) => targets.forEach((t, i) => {
        st[i].vx = st[i].vy = 0; // stop any throw still in flight
        if (animate) gsap.to(st[i], { ...t, duration: 1, delay: i * stagger, ease: 'expo.out', overwrite: true, onUpdate: () => apply(i) });
        else { Object.assign(st[i], t); apply(i); }
      });

      // every print gets a spot on the table, then scroll deals them out (and back in)
      scatter().forEach((t, i) => { Object.assign(st[i], t); cards[i].style.zIndex = i + 1; });
      if (animate) {
        const trig = ScrollTrigger.create({
          trigger: pile, start: 'top 95%', end: 'top 45%',
          onUpdate: self => gsap.to(deal, { p: self.progress, duration: 0.6, ease: 'power2.out', overwrite: true, onUpdate: applyAll }),
          onRefresh: self => { deal.p = self.progress; applyAll(); },
        });
        cleanups.push(() => trig.kill());
      } else deal.p = 1;
      applyAll();

      const fling = i => {
        const c = st[i], card = cards[i];
        const step = () => {
          if (card.classList.contains('is-dragging') || !card.isConnected || Math.hypot(c.vx, c.vy) <= 0.15) return;
          const { cw, ch } = size(i), W = pile.clientWidth, H = pile.clientHeight;
          c.x += c.vx; c.y += c.vy; c.vx *= 0.93; c.vy *= 0.93;
          c.r = clamp(c.r + c.vx * 0.25, -40, 40);
          if (c.x < -cw * 0.25) { c.x = -cw * 0.25; c.vx *= -0.5; }
          if (c.x > W - cw * 0.75) { c.x = W - cw * 0.75; c.vx *= -0.5; }
          if (c.y < -ch * 0.15) { c.y = -ch * 0.15; c.vy *= -0.5; }
          if (c.y > H - ch * 0.6) { c.y = H - ch * 0.6; c.vy *= -0.5; }
          apply(i);
          if (Math.hypot(c.vx, c.vy) > 0.15) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      cards.forEach((card, i) => {
        let start = null, prev = null, moved = false;
        card.addEventListener('pointerdown', e => {
          if (e.button !== 0 || dealt(i) < 0.9) return;
          if (hasGSAP) gsap.killTweensOf(st[i]);
          card.setPointerCapture(e.pointerId);
          card.style.zIndex = ++top; card.classList.add('is-dragging');
          start = { px: e.clientX, py: e.clientY, x: st[i].x, y: st[i].y };
          prev = { x: e.clientX, y: e.clientY, t: performance.now() };
          moved = false; st[i].vx = st[i].vy = 0; st[i].s = 1.05; apply(i);
        });
        card.addEventListener('pointermove', e => {
          if (!start) return;
          const dx = e.clientX - start.px, dy = e.clientY - start.py;
          if (Math.hypot(dx, dy) > 6) moved = true;
          const now = performance.now(), dt = Math.max(1, now - prev.t);
          st[i].vx = lerp(st[i].vx, ((e.clientX - prev.x) / dt) * 16, 0.5);
          st[i].vy = lerp(st[i].vy, ((e.clientY - prev.y) / dt) * 16, 0.5);
          prev = { x: e.clientX, y: e.clientY, t: now };
          const { cw, ch } = size(i);
          st[i].x = clamp(start.x + dx, -cw * 0.25, pile.clientWidth - cw * 0.75);
          st[i].y = clamp(start.y + dy, -ch * 0.15, pile.clientHeight - ch * 0.6);
          st[i].r = lerp(st[i].r, clamp(st[i].vx * 1.6, -22, 22), 0.2);
          apply(i);
        });
        const end = () => {
          if (!start) return;
          start = null; card.classList.remove('is-dragging'); st[i].s = 1;
          card.dataset.moved = moved ? '1' : '';
          if (moved && !reduced) { if (tidy) { tidy = false; if (tidyBtn) tidyBtn.textContent = 'Tidy up'; } fling(i); } else apply(i);
        };
        card.addEventListener('pointerup', end);
        card.addEventListener('pointercancel', end);
        card.addEventListener('click', () => {
          if (card.dataset.moved) { card.dataset.moved = ''; return; }
          openLightbox($$('img', pile), i);
        });
      });

      const untidy = () => { tidy = false; pile.style.height = ''; if (tidyBtn) tidyBtn.textContent = 'Tidy up'; };
      if (shuffleBtn) shuffleBtn.addEventListener('click', () => {
        untidy();
        cards.forEach(c => { c.style.zIndex = Math.ceil(Math.random() * cards.length); });
        moveTo(scatter());
      });
      if (tidyBtn) tidyBtn.addEventListener('click', () => {
        if (tidy) { untidy(); moveTo(scatter()); }
        else { tidy = true; tidyBtn.textContent = 'Scatter'; cards.forEach((c, i) => { c.style.zIndex = i + 1; }); moveTo(grid()); }
        if (hasGSAP) ScrollTrigger.refresh();
      });
      const onResize = () => {
        if (tidy) { moveTo(grid(), 0); return; }
        cards.forEach((_, i) => {
          const { cw, ch } = size(i);
          st[i].x = clamp(st[i].x, -cw * 0.25, pile.clientWidth - cw * 0.75);
          st[i].y = clamp(st[i].y, -ch * 0.15, pile.clientHeight - ch * 0.6);
          apply(i);
        });
      };
      addEventListener('resize', onResize);
      cleanups.push(() => removeEventListener('resize', onResize));
    });
  }
  function bindRoster(main) {
    if (!finePointer || reduced) return;
    $$('.artist-row, .follow-row', main).forEach(row => {
      row.addEventListener('pointerenter', () => { floatImg.src = row.dataset.img; float.classList.add('is-on'); });
      row.addEventListener('pointerleave', () => float.classList.remove('is-on'));
    });
  }
  function bindShows(main) {
    if (!finePointer || reduced) return;
    $$('.show, .arc', main).forEach(s => {
      s.addEventListener('pointerenter', () => { peekImg.src = s.dataset.img; peek.classList.add('is-on'); });
      s.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
  }
  function bindTilt(main) {
    if (!finePointer || reduced) return;
    $$('[data-tilt]', main).forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 14}deg) translateZ(0)`;
        card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
  function bindClocks(main) {
    const clocks = $$('[data-tz]', main);
    if (!clocks.length) return;
    const tick = () => {
      const now = new Date();
      clocks.forEach(el => {
        try {
          const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: el.dataset.tz }).formatToParts(now);
          el.innerHTML = `${parts.find(p => p.type === 'hour').value}<span class="colon">:</span>${parts.find(p => p.type === 'minute').value}`;
        } catch (e) { el.textContent = '--:--'; }
      });
    };
    tick();
    const id = setInterval(tick, 15000);
    cleanups.push(() => clearInterval(id));
  }
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  function bindForms(main) {
    const drop = $('#dropForm', main);
    if (drop) drop.addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#dropEmail', main).value.trim(), msg = $('#dropMsg', main);
      msg.classList.toggle('is-error', !emailOk(v));
      msg.textContent = emailOk(v) ? 'Prototype: this would add you to the drop list. Nothing was sent.' : 'Enter an email like name@example.com.';
    });
    const contact = $('#contactForm', main);
    if (contact) contact.addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('#contactMsg', main);
      const name = $('#cName', main).value.trim(), email = $('#cEmail', main).value.trim(), body = $('#cMsg', main).value.trim();
      let err = '';
      if (!name) err = 'Add your name so we know who to reply to.';
      else if (!emailOk(email)) err = 'Enter an email like name@example.com.';
      else if (body.length < 10) err = 'Tell us a little more in the message.';
      msg.classList.toggle('is-error', !!err);
      const topic = ($('input[name="topic"]:checked', main) || {}).value || 'Message';
      msg.textContent = err || `Prototype: your ${topic.toLowerCase()} request is ready to send once the form is wired up. Nothing was sent.`;
    });
  }
  function bindCrate(main) {
    const crate = $('#crate', main);
    if (!crate) return;
    const track = $('#crateTrack', main), countOut = $('#musicCount', main), records = $$('.record', track);
    const total = String(records.length).padStart(2, '0');
    const setCount = i => { countOut.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`; };
    dragScroll(crate, { skip: () => crate.classList.contains('is-pinned') });
    crate.addEventListener('scroll', () => {
      if (crate.classList.contains('is-pinned')) return;
      const w = records[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 24);
      setCount(clamp(Math.round(crate.scrollLeft / w), 0, records.length - 1));
    }, { passive: true });
    if (!animate) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (hover: hover)', () => {
      crate.classList.add('is-pinned');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth + 2 * parseFloat(getComputedStyle(crate).paddingLeft));
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: $('.music__pin', main), pin: true, start: 'top top', end: () => `+=${dist()}`, scrub: 0.6, invalidateOnRefresh: true, refreshPriority: 1,
          onUpdate: self => setCount(Math.min(records.length - 1, Math.floor(self.progress * records.length))),
        },
      });
      const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
      const vLoop = () => skew(clamp(tween.scrollTrigger.getVelocity() / -400, -6, 6));
      gsap.ticker.add(vLoop);
      return () => { crate.classList.remove('is-pinned'); gsap.ticker.remove(vLoop); gsap.set(track, { clearProps: 'transform' }); };
    });
    cleanups.push(() => mm.revert());
  }

  /* =====================================================================
     PAGE TRANSITIONS — swap <main>, keep everything else alive
     ===================================================================== */
  const curtain = $('#curtain'), curtainLabel = $('#curtainLabel');
  const cols = curtain ? $$('.curtain__cols i', curtain) : [];
  const normPath = u => u.pathname.replace(/index\.html$/, '');
  let navigating = false;

  async function coverIn(label) {
    if (reduced || !cols.length) return;
    curtain.classList.add('is-active');
    curtainLabel.textContent = label || '';
    curtainLabel.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 360, fill: 'forwards', easing: 'cubic-bezier(.2,.7,.1,1)' });
    await Promise.all(cols.map((c, i) => c.animate(
      [{ transform: 'scaleY(0)', transformOrigin: 'bottom' }, { transform: 'scaleY(1)', transformOrigin: 'bottom' }],
      { duration: 520, delay: i * 40, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished));
  }
  async function coverOut() {
    if (reduced || !cols.length) return;
    curtainLabel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    await Promise.all(cols.map((c, i) => c.animate(
      [{ transform: 'scaleY(1)', transformOrigin: 'top' }, { transform: 'scaleY(0)', transformOrigin: 'top' }],
      { duration: 620, delay: 120 + i * 40, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished));
    curtain.classList.remove('is-active');
  }

  async function navigate(url, { push = true } = {}) {
    if (navigating) return;
    navigating = true;
    const target = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
    try {
      const fetching = fetch(url.href, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });
      const file = (url.pathname.split('/').pop() || '').replace(/\.html$/, '');
      const labels = { shows: 'Shows', wear: 'Throne Wear', contact: 'Contact', index: 'Throne', '': 'Throne' };
      await coverIn(labels[file] !== undefined ? labels[file] : file.replace(/-/g, ' '));
      const doc = new DOMParser().parseFromString(await fetching, 'text/html');
      const nextMain = doc.querySelector('main');
      if (!nextMain) throw new Error('no main');
      teardownPage();
      if (push) history.pushState({}, '', url.href);
      document.title = doc.title;
      document.querySelector('main').replaceWith(document.adoptNode(nextMain));
      closeMenu();
      scrollToTarget(0, true);
      initPage(nextMain);
      if (hasGSAP) ScrollTrigger.refresh();
      const el = target && document.getElementById(target);
      if (el) { scrollToTarget(el, true); if (hasGSAP) ScrollTrigger.refresh(); }
      nextMain.setAttribute('tabindex', '-1'); nextMain.focus({ preventScroll: true });
      await coverOut();
    } catch (err) {
      location.href = url.href; // fall back to a normal page load
    } finally {
      navigating = false;
    }
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.getAttribute('href') === '#top') { e.preventDefault(); closeMenu(); scrollToTarget(0); return; }
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (normPath(url) === normPath(location) && url.search !== location.search) {
      e.preventDefault(); closeMenu();
      history.pushState({}, '', url.href);
      dispatchEvent(new Event('throne:query'));
      const el = document.getElementById('write');
      if (el) scrollToTarget(el);
      return;
    }
    if (normPath(url) === normPath(location)) {
      e.preventDefault(); closeMenu();
      const el = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      scrollToTarget(el || 0);
      return;
    }
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    e.preventDefault();
    navigate(url);
  });
  addEventListener('popstate', () => navigate(new URL(location.href), { push: false }));

  // Persistent chrome: pin relative links to absolute URLs so they survive URL changes.
  $$('#nav a[href], #menu a[href], .footer a[href]').forEach(a => {
    const raw = a.getAttribute('href');
    if (raw && !raw.startsWith('#') && !/^[a-z]+:/i.test(raw)) a.setAttribute('href', new URL(raw, location.href).href);
  });

  // page tone follows whichever section sits in the middle of the screen
  if ('IntersectionObserver' in window) {
    const root = document.documentElement;
    const tones = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) root.dataset.tone = en.target.dataset.tone;
    }), { rootMargin: '-50% 0px -50% 0px' });
    const watchTones = () => {
      tones.disconnect();
      const first = $('main [data-tone]');
      root.dataset.tone = first ? first.dataset.tone : 'dark';
      $$('main [data-tone], footer[data-tone]').forEach(sec => tones.observe(sec));
    };
    addEventListener('throne:page', watchTones);
    watchTones();
  }

  // active section in the nav
  if ('IntersectionObserver' in window) {
    const links = $$('.nav__links a');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) links.forEach(l => { const h = new URL(l.href).hash; if (h) l.classList.toggle('is-active', h === `#${en.target.id}`); });
    }), { rootMargin: '-45% 0px -50% 0px' });
    const watch = () => {
      io.disconnect();
      links.forEach(l => {
        const u = new URL(l.href), here = !u.hash && normPath(u) === normPath(location);
        l.classList.toggle('is-active', here);
        if (here) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
      });
      if (document.body.dataset.page === 'home') ['artists', 'music', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
    };
    addEventListener('throne:page', watch);
    watch();
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  const firstMain = $('main');
  initPage(firstMain, { first: true });

  const loader = $('#loader');
  function revealSite() {
    document.body.classList.remove('is-loading');
    if (animate) {
      introPage(firstMain);
      gsap.from('.nav', { yPercent: -100, duration: 1, ease: 'expo.out', delay: 0.5 });
      gsap.from('.player', { yPercent: 100, duration: 1, ease: 'expo.out', delay: 0.8 });
    }
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(() => scrollToTarget(el, true), 60);
    }
  }
  if (reduced || !loader) {
    if (loader) loader.remove();
    loaderCrown.done = true; revealSite();
  } else {
    const start = performance.now(), DUR = 1500, countEl = $('#loaderCount');
    let skipped = false;
    loader.addEventListener('click', () => { skipped = true; });
    const tick = now => {
      const p = skipped ? 1 : clamp((now - start) / DUR, 0, 1), eased = 1 - Math.pow(1 - p, 3);
      loaderCrown.progress = eased * 1.05;
      countEl.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) { requestAnimationFrame(tick); return; }
      setTimeout(() => {
        loaderCrown.done = true; loader.classList.add('is-done');
        const anim = loader.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
        anim.onfinish = () => loader.remove();
        revealSite();
      }, skipped ? 0 : 220);
    };
    requestAnimationFrame(tick);
  }

  if (hasGSAP) {
    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { visuals.forEach(v => v.resize()); ScrollTrigger.refresh(); });
  }
})();
