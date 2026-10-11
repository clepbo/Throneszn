/* Throne Records — prototype interactions */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const pointer = { x: -9999, y: -9999 };
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  /* =====================================================================
     DOT-MATRIX CROWN — the logo, rebuilt as an equalizer
     ===================================================================== */
  const COLS = 19, ROWS = 14, BAND = 2, GAP = 1;
  const PEAKS = [0, 4.5, 9, 13.5, 18];
  // height of each spike column, above the band + gap
  const SPIKE = Array.from({ length: COLS }, (_, c) => {
    let m = 0;
    PEAKS.forEach(p => { m = Math.max(m, 1 - Math.abs(c - p) / 2.2); });
    return 1 + Math.round(9 * m) + (c === 9 ? 1 : 0);
  });
  const inCrown = (c, r) => r < BAND || (r >= BAND + GAP && r < BAND + GAP + SPIKE[c]);
  // stable per-dot noise for the build-in
  const NOISE = Array.from({ length: COLS * ROWS }, (_, i) => (Math.sin(i * 91.17) * 43758.5453) % 1);

  const levels = new Float32Array(COLS);   // 0..1 audio energy per column
  let audioEnergy = 0;

  class Crown {
    constructor(canvas, { interactive = false, ghost = true } = {}) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.interactive = interactive; this.ghost = ghost;
      this.progress = 1; this.visible = true;
      this.resize(); addEventListener('resize', () => this.resize());
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
      }
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.w = r.width; this.h = r.height;
      this.cv.width = Math.max(1, r.width * dpr); this.cv.height = Math.max(1, r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
          const appear = (r / ROWS) * 0.8 + Math.abs(NOISE[i]) * 0.2;
          if (appear > this.progress) continue;
          let x = this.ox + c * cell + cell / 2;
          let y = this.oy + (ROWS - 1 - r) * cell + cell / 2;

          const crown = inCrown(c, r);
          const hot = r < lvl;
          let a, col, size = rad;

          if (crown) {
            const shimmer = 0.78 + 0.22 * Math.sin(t * 0.0022 + c * 0.55 - r * 0.35);
            a = shimmer; col = hot ? '#fff1c9' : '#e3ad48';
            if (hot) size = rad * 1.12;
          } else if (hot) {
            a = 0.25 + 0.55 * (1 - r / ROWS); col = '#e3ad48'; size = rad * 0.8;
          } else {
            if (!this.ghost) continue;
            a = 0.12; col = '#6b5a3a'; size = rad * 0.55;
          }

          if (this.interactive) {
            const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), R = cell * 4.2;
            if (d < R) {
              const f = 1 - d / R;
              x += (dx / (d || 1)) * f * cell * 0.55;
              y += (dy / (d || 1)) * f * cell * 0.55;
              size *= 1 + f * 0.5; a = Math.min(1, a + f * 0.6);
              if (!crown) col = '#e3ad48';
            }
          }
          ctx.globalAlpha = a; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  const heroCrown = new Crown($('#heroCrown'), { interactive: finePointer && !reduced });
  const loaderCrown = new Crown($('#loaderCrown'), { ghost: true });

  /* =====================================================================
     AUDIO — persistent player + analyser feeding the crown
     ===================================================================== */
  const TRACKS = [
    { id: 'how-far', title: 'How Far', artist: 'Bros Throne', src: 'assets/audio/how_far.mp3', art: 'assets/img/featured_fet1_1.jpg' },
    { id: 'jesu', title: 'Jesu', artist: 'Bros Throne', src: 'assets/audio/jesu.mp3', art: 'assets/img/featured_fet1_2.jpg' },
  ];
  const audio = $('#audio');
  let current = null, actx = null, analyser = null, freq = null, audioGraphFailed = false;

  function ensureGraph() {
    if (actx || audioGraphFailed) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
      const srcNode = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.78;
      srcNode.connect(analyser); analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { audioGraphFailed = true; actx = null; analyser = null; }
  }

  function load(track) {
    current = track;
    audio.src = track.src;
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
    audio.play().catch(() => toast('Tap play again to start the track.'));
  }

  function syncUI() {
    const playing = !audio.paused && !audio.ended;
    document.body.classList.toggle('is-playing', playing);
    $('#playerIcon use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('#playerToggle').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $$('.record[data-play]').forEach(r => {
      const on = current && r.dataset.play === current.id;
      r.classList.toggle('is-current', !!on);
      r.classList.toggle('is-spinning', !!on && playing);
      const icon = $('.record__play use', r);
      if (icon) icon.setAttribute('href', on && playing ? '#i-pause' : '#i-play');
    });
    $$('.now-chip').forEach(chip => {
      const icon = $('.now-chip__btn use', chip);
      const on = current && chip.dataset.play === current.id && playing;
      icon.setAttribute('href', on ? '#i-pause' : '#i-play');
      $('small', chip).textContent = on ? 'Now playing · the crown listens' : 'Press play · the crown listens';
    });
  }
  ['play', 'pause', 'ended'].forEach(ev => audio.addEventListener(ev, syncUI));
  audio.addEventListener('ended', () => nextTrack(true));

  const fmt = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
  const seek = $('#playerSeek');
  let seeking = false;
  audio.addEventListener('timeupdate', () => {
    if (seeking || !audio.duration) return;
    const p = audio.currentTime / audio.duration;
    seek.value = Math.round(p * 1000);
    seek.style.setProperty('--p', `${p * 100}%`);
    $('#playerCur').textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => { $('#playerDur').textContent = fmt(audio.duration); });
  seek.addEventListener('input', () => { seeking = true; seek.style.setProperty('--p', `${seek.value / 10}%`); });
  seek.addEventListener('change', () => {
    if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
    seeking = false;
  });

  function nextTrack(autoplay) {
    const i = current ? TRACKS.indexOf(current) : -1;
    const n = TRACKS[(i + 1) % TRACKS.length];
    load(n);
    if (autoplay !== false) { ensureGraph(); audio.play().catch(() => {}); }
    syncUI();
  }
  $('#playerToggle').addEventListener('click', () => play(current ? current.id : 'how-far'));
  $('#playerNext').addEventListener('click', () => nextTrack(true));
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-play]');
    if (!el) return;
    // inner sr-only button bubbles to the article; handle once
    if (el.tagName === 'ARTICLE' && e.target.closest('button[data-play]')) return;
    e.preventDefault();
    play(el.dataset.play);
  });
  load(TRACKS[0]);
  syncUI();

  // fold analyser bins into the 19 columns, mirrored so bass sits in the centre spike
  function readLevels(t) {
    const playing = !audio.paused;
    if (playing && analyser) {
      analyser.getByteFrequencyData(freq);
      const half = Math.ceil(COLS / 2); // 10 bands
      const maxBin = Math.floor(freq.length * 0.72);
      let sum = 0;
      for (let b = 0; b < half; b++) {
        const lo = Math.floor(Math.pow(b / half, 1.9) * maxBin);
        const hi = Math.max(lo + 1, Math.floor(Math.pow((b + 1) / half, 1.9) * maxBin));
        let v = 0; for (let k = lo; k < hi; k++) v = Math.max(v, freq[k]);
        v = Math.pow(v / 255, 1.6) * (0.85 + b * 0.05);
        sum += v;
        const cL = 9 - b, cR = 9 + b;
        levels[cL] = lerp(levels[cL], v, 0.5);
        if (cR < COLS) levels[cR] = lerp(levels[cR], v, 0.5);
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

  const hero = $('.hero');
  function frame(t) {
    readLevels(t);
    heroCrown.draw(t);
    if (!loaderCrown.done) loaderCrown.draw(t);
    hero.style.setProperty('--glow', (0.55 + audioEnergy * 0.9).toFixed(3));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* =====================================================================
     LOADER + INTRO
     ===================================================================== */
  const loader = $('#loader');
  const countEl = $('#loaderCount');
  function intro() {
    document.body.classList.remove('is-loading');
    if (!hasGSAP || reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__letters span', { yPercent: 105, duration: 1.3, stagger: 0.06 })
      .from(heroCrown, { progress: 0, duration: 1.6, ease: 'power2.out' }, 0)
      .from('.hero__sub', { opacity: 0, letterSpacing: '0.2em', duration: 1.2 }, 0.4)
      .from('.hero .reveal-up', { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, 0.6)
      .from('.nav', { yPercent: -100, duration: 1 }, 0.5)
      .from('.player', { yPercent: 100, duration: 1 }, 0.8);
  }
  function finishLoader() {
    loaderCrown.done = true;
    loader.classList.add('is-done');
    const anim = loader.animate(
      [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
      { duration: reduced ? 1 : 900, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }
    );
    anim.onfinish = () => loader.remove();
    intro();
  }
  if (reduced) {
    loader.remove(); loaderCrown.done = true; document.body.classList.remove('is-loading');
  } else {
    const start = performance.now(), DUR = 1500;
    let skipped = false;
    loader.addEventListener('click', () => { skipped = true; });
    const tick = now => {
      const p = skipped ? 1 : clamp((now - start) / DUR, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      loaderCrown.progress = eased * 1.05;
      countEl.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finishLoader, skipped ? 0 : 220);
    };
    requestAnimationFrame(tick);
  }

  /* =====================================================================
     SMOOTH SCROLL
     ===================================================================== */
  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  function scrollToTarget(target) {
    const offset = -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72);
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : offset, duration: 1.4 });
    else {
      const y = target === 0 ? 0 : target.getBoundingClientRect().top + scrollY + offset;
      scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id === 'top' || id === '' ? 0 : document.getElementById(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
  });

  /* =====================================================================
     NAV
     ===================================================================== */
  const nav = $('#nav');
  let lastY = 0;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 700 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const sectionLinks = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        sectionLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['artists', 'music', 'shows', 'wear', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  const burger = $('#burger'), menu = $('#menu');
  function openMenu() {
    menu.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open');
    lenis && lenis.stop();
    if (hasGSAP && !reduced) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' });
      gsap.from('.menu__links a', { yPercent: 120, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out', delay: 0.25 });
    }
  }
  function closeMenu() {
    if (menu.hidden) return;
    burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open');
    lenis && lenis.start();
    if (hasGSAP && !reduced) gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.55, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } });
    else menu.hidden = true;
  }
  burger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeDrawer(); } });

  /* =====================================================================
     CURSOR + MAGNETIC
     ===================================================================== */
  const cursor = $('#cursor'), cursorLabel = $('#cursorLabel');
  if (finePointer && !reduced) {
    document.body.classList.add('has-cursor');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const loop = () => {
      pos.x = lerp(pos.x, pointer.x, 0.22); pos.y = lerp(pos.y, pointer.y, 0.22);
      cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
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

    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.28, dy = (e.clientY - (r.top + r.height / 2)) * 0.38;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(.2,.7,.1,1)'; el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 500);
      });
    });
  }

  /* =====================================================================
     TEXT SPLITS + REVEALS
     ===================================================================== */
  function splitWords(el, inner = true) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(w => inner
      ? `<span class="w" aria-hidden="true"><span class="wi">${w}</span></span>`
      : `<span class="word" aria-hidden="true">${w}</span>`).join(' ');
  }
  $$('[data-split]').forEach(el => splitWords(el, true));

  const scrubEl = $('[data-scrub]');
  if (scrubEl) {
    splitWords(scrubEl, false);
    const gold = /^(believers|straight-shooters|storytellers\.?|redefine|define|change|world\.)$/i;
    $$('.word', scrubEl).forEach(w => { if (gold.test(w.textContent.replace(/[,]/g, ''))) w.classList.add('is-gold'); });
  }

  if (hasGSAP && !reduced) {
    gsap.registerPlugin(ScrollTrigger);

    $$('[data-split]').forEach(el => {
      gsap.from($$('.wi', el), {
        yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    // manifesto: words light up as you read
    if (scrubEl) {
      document.documentElement.classList.add('js-scrub');
      const words = $$('.word', scrubEl);
      ScrollTrigger.create({
        trigger: scrubEl, start: 'top 80%', end: 'bottom 45%', scrub: true,
        onUpdate: self => {
          const n = Math.round(self.progress * words.length);
          words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
        },
      });
    }

    gsap.from('.manifesto__facts > div', { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.manifesto__facts', start: 'top 90%', once: true } });
    gsap.from('.artist-row', { y: 60, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.artist-list', start: 'top 85%', once: true } });
    gsap.from('.show', { y: 40, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.show-list', start: 'top 88%', once: true } });
    gsap.from('.tilt', { y: 80, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: '.wear__cards', start: 'top 85%', once: true } });
    gsap.from('.city', { y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.cities', start: 'top 90%', once: true } });

    // hero: wordmark spreads and crown lifts as you leave
    gsap.to('.hero__word', {
      scale: 0.9, yPercent: -12, opacity: 0.35, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.hero__crown', { yPercent: -30, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // feature: cover drifts against the disc
    gsap.fromTo('.feature__cover', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.feature__disc', { xPercent: -30 }, { xPercent: 0, ease: 'power2.out', scrollTrigger: { trigger: '.feature', start: 'top 80%', end: 'center center', scrub: true } });

    // footer wordmark rises in
    gsap.from('.footer__word', { yPercent: 40, opacity: 0, ease: 'expo.out', duration: 1.4, scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true } });
  }

  /* =====================================================================
     MUSIC CRATE — pinned horizontal scroll on desktop, swipe on touch
     ===================================================================== */
  const crate = $('#crate'), track = $('#crateTrack'), countOut = $('#musicCount');
  const records = $$('.record', track);
  const total = String(records.length).padStart(2, '0');
  const setCount = i => { countOut.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`; };
  if (hasGSAP && !reduced) {
    ScrollTrigger.matchMedia({
      '(min-width: 900px) and (hover: hover)': () => {
        crate.classList.add('is-pinned');
        const dist = () => Math.max(0, track.scrollWidth - innerWidth + 2 * parseFloat(getComputedStyle(crate).paddingLeft));
        const tween = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: '.music__pin', pin: true, start: 'top top', end: () => `+=${dist()}`, scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: self => setCount(Math.min(records.length - 1, Math.floor(self.progress * records.length))),
          },
        });
        // records tilt slightly with scroll velocity
        const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
        const st = tween.scrollTrigger;
        const vLoop = () => { skew(clamp(st.getVelocity() / -400, -6, 6)); };
        gsap.ticker.add(vLoop);
        return () => { crate.classList.remove('is-pinned'); gsap.ticker.remove(vLoop); gsap.set(track, { x: 0, skewX: 0 }); };
      },
    });
  }
  crate.addEventListener('scroll', () => {
    if (crate.classList.contains('is-pinned')) return;
    const w = records[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24);
    setCount(clamp(Math.round(crate.scrollLeft / w), 0, records.length - 1));
  }, { passive: true });

  /* =====================================================================
     ARTISTS — floating portrait + drawer
     ===================================================================== */
  const ARTISTS = {
    bros: {
      name: 'Bros Throne', role: 'Artist · Founder & CEO', img: 'assets/img/featured_fet1_1.jpg',
      bio: 'Ogbe Japhet, known as Bros Throne, founded Throne Records in 2021 and still leads it from the front. His records move between Afrobeats and ghetto gospel, from the street-level bounce of How Far to the testimony of Jesu and Big God.',
      facts: [['Real name', 'Ogbe Japhet'], ['From', 'Edo State, Nigeria'], ['Based', 'Russia'], ['Notable', 'Big God SZN (EP), Reckless ft. ODUMODUBLVCK, Neighborhood Hero ft. Zlatan Ibile']],
      play: 'how-far',
      links: [['Instagram', 'https://www.instagram.com/brosthrone'], ['YouTube', 'https://www.youtube.com/@BrosThrone']],
    },
    kidd: {
      name: 'Kidd Carder', role: 'Artist · Songwriter', img: 'assets/img/featured_fet_kid1.jpg',
      bio: 'Kidd Carder writes and performs for the Throne roster, bringing a songwriter’s ear to the label’s Afrobeats records.',
      facts: [['Role', 'Artist & songwriter'], ['Label', 'Throne Records']],
      links: [],
    },
    lilcase: {
      name: 'Lilcase', role: 'Singer · Artist', img: 'assets/img/portfolio_lil_case.jpg',
      bio: 'Lilcase is the voice on Big God, the lead single from Bros Throne’s Big God SZN, and one of the label’s core singers.',
      facts: [['Stage name', 'Lilcase'], ['Featured on', 'Big God (Bros Throne ft. Lilcase)']],
      links: [],
    },
  };

  const float = $('#artistFloat'), floatImg = $('#artistFloatImg');
  if (finePointer && !reduced) {
    const fp = { x: innerWidth / 2, y: innerHeight / 2 };
    let floatOn = false;
    const fl = () => {
      fp.x = lerp(fp.x, pointer.x, 0.12); fp.y = lerp(fp.y, pointer.y, 0.12);
      const rot = clamp((pointer.x - fp.x) * 0.05, -8, 8);
      float.style.transform = `translate3d(${fp.x - float.offsetWidth / 2}px, ${fp.y - float.offsetHeight / 2}px, 0) rotate(${rot}deg)`;
      requestAnimationFrame(fl);
    };
    fl();
    $$('.artist-row').forEach(row => {
      row.addEventListener('pointerenter', () => {
        floatImg.src = row.dataset.img; float.classList.add('is-on'); floatOn = true;
      });
      row.addEventListener('pointerleave', () => { float.classList.remove('is-on'); floatOn = false; });
    });
  }

  const drawer = $('#drawer');
  let lastFocus = null;
  function openDrawer(key) {
    const a = ARTISTS[key]; if (!a) return;
    lastFocus = document.activeElement;
    $('#drawerImg').src = a.img; $('#drawerImg').alt = a.name;
    $('#drawerName').textContent = a.name;
    $('#drawerRole').textContent = a.role;
    $('#drawerBio').textContent = a.bio;
    $('#drawerFacts').innerHTML = a.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const acts = [];
    if (a.play) acts.push(`<button class="btn btn--gold" type="button" data-play="${a.play}">Play How Far</button>`);
    a.links.forEach(([l, h]) => acts.push(`<a class="btn btn--ghost" href="${h}" target="_blank" rel="noopener">${l}</a>`));
    $('#drawerActions').innerHTML = acts.join('');
    drawer.hidden = false; float.classList.remove('is-on');
    lenis && lenis.stop();
    if (hasGSAP && !reduced) {
      gsap.fromTo('.drawer__scrim', { opacity: 0 }, { opacity: 1, duration: 0.4 });
      gsap.fromTo('.drawer__panel', { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: 'expo.out' });
      gsap.fromTo('.drawer__img img', { scale: 1.25 }, { scale: 1, duration: 1.2, ease: 'expo.out' });
      gsap.from('.drawer__body > *', { y: 24, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', delay: 0.2 });
    }
    $('.drawer__close').focus();
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    const done = () => { drawer.hidden = true; lenis && lenis.start(); lastFocus && lastFocus.focus(); };
    if (hasGSAP && !reduced) {
      gsap.to('.drawer__panel', { xPercent: 100, duration: 0.5, ease: 'expo.in' });
      gsap.to('.drawer__scrim', { opacity: 0, duration: 0.5, onComplete: done });
    } else done();
  }
  $$('.artist-row').forEach(r => r.addEventListener('click', () => openDrawer(r.dataset.artist)));
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); });

  /* =====================================================================
     SHOWS — image peeks beside the cursor
     ===================================================================== */
  const peek = $('#showPeek'), peekImg = $('#showPeekImg');
  if (finePointer && !reduced) {
    const pp = { x: 0, y: 0 };
    const pl = () => {
      pp.x = lerp(pp.x, pointer.x + 40, 0.16); pp.y = lerp(pp.y, pointer.y - 110, 0.16);
      peek.style.left = `${pp.x}px`; peek.style.top = `${pp.y}px`;
      requestAnimationFrame(pl);
    };
    pl();
    $$('.show').forEach(s => {
      s.addEventListener('pointerenter', () => { peekImg.src = s.dataset.img; peek.classList.add('is-on'); });
      s.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
  }

  /* =====================================================================
     TILT CARDS
     ===================================================================== */
  if (finePointer && !reduced) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 14}deg) translateZ(0)`;
        card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* =====================================================================
     FOOTER spotlight
     ===================================================================== */
  const fw = $('.footer__word');
  fw.addEventListener('pointermove', e => {
    const r = fw.getBoundingClientRect();
    fw.style.setProperty('--fx', `${((e.clientX - r.left) / r.width) * 100}%`);
    fw.style.setProperty('--fy', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
  fw.addEventListener('pointerleave', () => { fw.style.setProperty('--fx', '-30%'); });
  fw.style.setProperty('--fx', '-30%');

  /* =====================================================================
     CITY CLOCKS
     ===================================================================== */
  const clocks = $$('[data-tz]');
  function tickClocks() {
    const now = new Date();
    clocks.forEach(el => {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: el.dataset.tz }).formatToParts(now);
        const h = parts.find(p => p.type === 'hour').value, m = parts.find(p => p.type === 'minute').value;
        el.innerHTML = `${h}<span class="colon">:</span>${m}`;
      } catch (e) { el.textContent = '--:--'; }
    });
  }
  tickClocks(); setInterval(tickClocks, 15000);

  /* =====================================================================
     FORMS, COPY, TOAST
     ===================================================================== */
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  $('#dropForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#dropEmail').value.trim(), msg = $('#dropMsg');
    msg.classList.toggle('is-error', !emailOk(v));
    msg.textContent = emailOk(v) ? 'Prototype: this would add you to the drop list. Nothing was sent.' : 'Enter an email like name@example.com.';
  });
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#contactMsg');
    const name = $('#cName').value.trim(), email = $('#cEmail').value.trim(), body = $('#cMsg').value.trim();
    let err = '';
    if (!name) err = 'Add your name so we know who to reply to.';
    else if (!emailOk(email)) err = 'Enter an email like name@example.com.';
    else if (body.length < 10) err = 'Tell us a little more in the message.';
    msg.classList.toggle('is-error', !!err);
    const topic = ($('input[name="topic"]:checked') || {}).value || 'Message';
    msg.textContent = err || `Prototype: your ${topic.toLowerCase()} request is ready to send once the form is wired up. Nothing was sent.`;
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy;
    const fallback = () => {
      const range = document.createRange(); range.selectNodeContents(b);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      toast('Selected. Press copy on your keyboard.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}`), fallback);
    } else fallback();
  });

  // fonts and images change layout; keep ScrollTrigger measurements honest
  if (hasGSAP) {
    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { heroCrown.resize(); ScrollTrigger.refresh(); });
  }
})();
