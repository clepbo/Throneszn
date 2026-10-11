// Interaction QA: drives every feature like a visitor, on desktop and phone.
const { chromium } = require('playwright');
const V = process.env.VENDOR_DIR; // optional: serve CDN scripts from a local folder (offline/sandboxed runs)
const SH = process.env.SHOTS_DIR || require('os').tmpdir() + '/';
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const fontCache={};
const [W,H] = (process.argv[2]||'1440x900').split('x').map(Number);
const mobile = W < 700;
let pass=0, fail=0;
const check = (name, ok, extra='') => { console.log((ok?'ok   ':'FAIL ')+name+(extra?'  ('+extra+')':'')); ok?pass++:fail++; };
(async () => {
  const b = await chromium.launch({ args:['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport:{width:W,height:H}, hasTouch:mobile, isMobile:mobile });
  if (V) await ctx.route(/cdnjs|jsdelivr/, r => { const u=r.request().url(); const f=u.includes('ScrollTrigger')?'ScrollTrigger.min.js':u.includes('lenis')?'lenis.min.js':'gsap.min.js'; r.fulfill({path:V+f, contentType:'application/javascript'}); });
  if (V) await ctx.route(/fonts\.(googleapis|gstatic)/, r => { const u=r.request().url(); if(!fontCache[u]) fontCache[u]=require('child_process').execFileSync('curl',['-s','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',u]); r.fulfill({body:fontCache[u], contentType: u.includes('css2')?'text/css':'font/woff2'}); });
  await ctx.route(/youtube|ytimg/, r => r.fulfill({ body:'<html><body style="background:#000"></body></html>', contentType:'text/html' }));
  const p = await ctx.newPage();
  const errs=[];
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR '+e.message));
  const ev = (f, a) => p.evaluate(f, a);
  const go = async (sel, off=0) => { await ev(([s,o]) => { const el=document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + o); }, [sel, off]); await p.waitForTimeout(1200); };
  const tap = async sel => { if (mobile) { const loc = p.locator(sel).first(); await loc.evaluate(el => { const sc = el.closest('.desk-tabs, .crate, .mood__strip'); if (sc) sc.scrollLeft += el.getBoundingClientRect().left - sc.getBoundingClientRect().left - 16; const r = el.getBoundingClientRect(); if (r.top < 80 || r.bottom > innerHeight - 90) window.scrollTo(0, scrollY + r.top - innerHeight / 2 + r.height / 2); }); await p.waitForTimeout(350); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x+bb.width/2, bb.y+bb.height/2); } else await p.click(sel); };
  const playing = () => ev(() => !document.getElementById('audio').paused);

  // ---------- HOME ----------
  await p.goto(BASE, { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(300);
  check('loader shows on first load', await ev(() => !!document.getElementById('loader')));
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(2600);
  check('loader clears and page unlocks', await ev(() => !document.getElementById('loader') && !document.body.classList.contains('is-loading')));
  const pins0 = await ev(() => (() => window.ScrollTrigger ? ScrollTrigger.getAll().filter(t => t.pin).map(t => { const el = t.trigger; const top = el.getBoundingClientRect().top + scrollY; return { name: (el.className||'').toString().split(' ')[0], off: Math.round(t.start - top) }; }) : [])());
  check('pinned sections start exactly at their section', pins0.length > 0 && pins0.every(x => Math.abs(x.off) <= 2), JSON.stringify(pins0));
  check('hero crown canvas is drawn', await ev(() => { const c=document.getElementById('heroCrown'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]) n++; return n>1000; }));
  await tap('.now-chip'); await p.waitForTimeout(1200);
  check('now-chip starts How Far', await playing());
  check('player shows pause + live state', await ev(() => document.body.classList.contains('is-playing') && document.querySelector('#playerIcon use').getAttribute('href')==='#i-pause'));
  check('crown reacts to audio (glow up)', await ev(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glow')) > 0.56));
  await tap('#playerToggle'); await p.waitForTimeout(300);
  check('player toggle pauses', !(await playing()));
  if (!mobile) { await tap('#playerNext'); await p.waitForTimeout(800);
  check('next track loads Jesu', await ev(() => document.getElementById('playerTitle').textContent==='Jesu') && await playing()); }
  else { await tap('#playerToggle'); await p.waitForTimeout(500); check('player toggle resumes', await playing()); }

  await go('.manifesto', 150);
  check('manifesto: page tone switches to light', await ev(() => document.documentElement.dataset.tone==='light'));
  check('manifesto words light up on scroll', await ev(() => document.querySelectorAll('.manifesto .word.is-lit').length > 3));
  await go('.trail', -20);
  const tb = await p.locator('.trail').boundingBox();
  if (mobile) { await p.touchscreen.tap(tb.x+100, tb.y+300); await p.touchscreen.tap(tb.x+250, tb.y+350); }
  else for (let i=0;i<10;i++){ await p.mouse.move(tb.x+100+i*90, tb.y+260+(i%2)*80); await p.waitForTimeout(40); }
  check('photo trail spawns images', await ev(() => document.querySelectorAll('.trail__img').length > 0), await ev(() => document.querySelectorAll('.trail__img').length+' images'));

  await go('#artists', 0);
  check('roster: tone back to dark', await ev(() => document.documentElement.dataset.tone==='dark'));
  if (!mobile) { await p.hover('.artist-row >> nth=1'); await p.waitForTimeout(500); check('roster hover shows floating portrait', await ev(() => document.getElementById('artistFloat').classList.contains('is-on'))); }

  await go('.zoom', 0); const z0 = await ev(() => getComputedStyle(document.querySelector('.zoom__media')).clipPath);
  await go('.zoom', Math.round(H*0.9)); const z1 = await ev(() => getComputedStyle(document.querySelector('.zoom__media')).clipPath);
  check('zoom photo grows with scroll', z0 !== z1, `${z0} → ${z1}`);

  await go('.music', 0); const x0 = await ev(() => getComputedStyle(document.getElementById('crateTrack')).transform);
  await go('.music', Math.round(H*1.2)); const x1 = await ev(() => getComputedStyle(document.getElementById('crateTrack')).transform);
  const pinned = await ev(() => document.getElementById('crate').classList.contains('is-pinned'));
  if (pinned) check('crate scrolls sideways while pinned', x0 !== x1, `${x0} → ${x1}`);
  else if (!mobile) { await go('.music', 0); const cb0 = await p.locator('.record >> nth=1').boundingBox(); const l0 = await ev(() => document.getElementById('crate').scrollLeft);
    await p.mouse.move(cb0.x+cb0.width/2, cb0.y+cb0.height/2); await p.mouse.down(); await p.mouse.move(cb0.x+cb0.width/2-250, cb0.y+cb0.height/2, {steps:8}); await p.mouse.up(); await p.waitForTimeout(400);
    check('crate drags sideways with a mouse (not pinned at this width)', await ev(l => document.getElementById('crate').scrollLeft > l, l0));
    check('dragging the crate did not start a track', await ev(() => document.getElementById('playerTitle').textContent==='Jesu')); }
  else { await ev(() => document.getElementById('crate').scrollBy(500,0)); await p.waitForTimeout(500); check('crate swipes and counter updates', await ev(() => !document.getElementById('musicCount').textContent.startsWith('01'))); }
  check('crate record shows playing state', await ev(() => !!document.querySelector('.record.is-current')));

  await go('#photos', 40); await p.waitForTimeout(1500);
  const before = await ev(() => document.querySelector('.pile__card:last-child').style.transform);
  const cb = await p.locator('.pile__card >> nth=-1').boundingBox();
  if (!mobile) { await p.mouse.move(cb.x+cb.width/2, cb.y+cb.height/2); await p.mouse.down(); for(let i=1;i<=8;i++){ await p.mouse.move(cb.x+cb.width/2-i*35, cb.y+cb.height/2+i*8); await p.waitForTimeout(16);} await p.mouse.up(); }
  else { const cdp = await ctx.newCDPSession(p); const sx=cb.x+cb.width/2, sy=cb.y+cb.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]}); for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx-i*15,y:sy+i*4}]}); await p.waitForTimeout(16);} await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
  await p.waitForTimeout(900);
  const after = await ev(() => document.querySelector('.pile__card:last-child').style.transform);
  check('photo table: drag moves a print', before !== after);
  check('photo table: drag did not open the viewer', await ev(() => document.getElementById('lightbox').hidden));
  await tap('[data-pile-tidy]'); await p.waitForTimeout(1400);
  const rots = await ev(() => [...document.querySelectorAll('.pile__card')].map(c => parseFloat((/rotate\(([-\d.e]+)deg\)/.exec(c.style.transform)||[])[1])));
  check('Tidy lines prints up (no rotation)', rots.every(r => Math.abs(r) < 0.5) && await ev(() => document.querySelector('[data-pile-tidy]').textContent==='Scatter'), rots.map(r=>r.toFixed(2)).join(' '));
  const overlap = await ev(() => { const r=[...document.querySelectorAll('.pile__card')].map(c=>c.getBoundingClientRect()); let o=0; for(let i=0;i<r.length;i++) for(let j=i+1;j<r.length;j++){ const a=r[i],b=r[j]; if(a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2) o++; } return o; });
  check('tidy grid has no overlapping prints', overlap===0, overlap+' overlaps');
  await tap('.pile__card >> nth=2'); await p.waitForTimeout(600);
  check('tapping a print opens the viewer', await ev(() => !document.getElementById('lightbox').hidden));
  const c1 = await ev(() => document.getElementById('lightboxCount').textContent);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  check('viewer: arrow key goes to next photo', await ev(c => document.getElementById('lightboxCount').textContent !== c, c1));
  for (let i=0;i<5;i++) await p.keyboard.press('Tab');
  check('viewer: Tab keeps focus inside the viewer', await ev(() => document.getElementById('lightbox').contains(document.activeElement)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  check('viewer: Escape closes it', await ev(() => document.getElementById('lightbox').hidden));
  check('photo table pulses with the beat (--beat set)', await ev(() => parseFloat(document.querySelector('[data-pile]').style.getPropertyValue('--beat')) > 0));
  await tap('[data-pile-tidy]'); await p.waitForTimeout(1300); // back to scattered
  const spread = () => ev(() => { const r=[...document.querySelectorAll('#photos .pile__card')].map(c=>c.getBoundingClientRect()); const xs=r.map(b=>b.left+b.width/2), ys=r.map(b=>b.top+b.height/2); return Math.round(Math.max(...xs)-Math.min(...xs) + Math.max(...ys)-Math.min(...ys)); });
  const sOpen = await spread();
  await go('#photos .pile', -Math.round(H*0.98)); await p.waitForTimeout(900);
  const sBack = await spread();
  check('scrolling back up gathers the prints into a stack', sBack < sOpen * 0.25, `spread ${sOpen}px → ${sBack}px`);
  await go('#photos', 40); await p.waitForTimeout(1200);
  const sAgain = await spread();
  check('scrolling down again deals them back to their spots', Math.abs(sAgain - sOpen) < sOpen * 0.05, `spread ${sAgain}px`);

  await go('.contact', 0);
  await tap('[data-copy]'); await p.waitForTimeout(300);
  check('copy button shows a toast', await ev(() => document.getElementById('toast').classList.contains('is-on')));
  await tap('.desk-link[href*="desk=demo"]'); await p.waitForTimeout(3200);
  check('home desk shortcut → Contact page in place', await ev(() => document.body.dataset.page==='contact' && location.search==='?desk=demo'));
  check('shortcut preselects the Demo desk', await ev(() => document.querySelector('.desk-tab[aria-selected="true"]').dataset.desk==='demo' && !document.querySelector('[data-for="demo"]').hidden && document.querySelector('[data-for="booking"]').hidden));
  check('music still playing on Contact', await playing());
  await go('#write', 0);
  await tap('.desk-tab[data-desk="booking"]'); await p.waitForTimeout(300);
  check('Booking tab shows booking fields', await ev(() => !document.querySelector('[data-for="booking"]').hidden && document.querySelector('[data-desk-to]').textContent.includes('management')));
  await tap('label[for="dk-lilcase"]'); await p.fill('#dkCity','Accra'); await p.fill('#dkName','Ada'); await p.fill('#dkMsg','We would love Lilcase for our festival.'); await p.waitForTimeout(200);
  check('letter writes itself (re, body, name)', await ev(() => document.querySelector('[data-l-re]').textContent==='Booking Lilcase in Accra' && document.querySelector('[data-l-body]').textContent.includes('festival') && document.querySelector('[data-l-name]').textContent==='Ada'));
  await tap('#deskForm button[type=submit]'); await p.waitForTimeout(200);
  check('missing email is flagged', await ev(() => document.getElementById('deskMsg').classList.contains('is-error')));
  await p.fill('#dkEmail','ada@example.com'); await tap('#deskForm button[type=submit]'); await p.waitForTimeout(700);
  check('send seals the envelope', await ev(() => document.querySelector('[data-letter]').classList.contains('is-sending')));
  await p.waitForTimeout(2200);
  check('then confirms (prototype) and resets the letter', await ev(() => /Nothing was sent/.test(document.getElementById('deskMsg').textContent) && !document.querySelector('[data-letter]').classList.contains('is-sending')));
  await tap('.desk-tab[data-desk="demo"]'); await p.fill('#dkLink','not a link'); await tap('#deskForm button[type=submit]'); await p.waitForTimeout(200);
  check('demo desk asks for a real link', await ev(() => /link to your music/.test(document.getElementById('deskMsg').textContent)));
  await ev(() => document.querySelector('.desk-tab[data-desk="demo"]').focus()); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  check('arrow keys move between desks', await ev(() => document.activeElement.dataset.desk==='press' && document.querySelector('.desk-tab[aria-selected="true"]').dataset.desk==='press'));
  check('contact page clocks tick', await ev(() => /\d\d:\d\d/.test(document.querySelector('.city__time').textContent)));

  // ---------- HOME → SHOWS (in-place) ----------
  await ev(() => window.scrollTo(0,0)); await p.waitForTimeout(600);
  const burgerNav = await p.locator('#burger').isVisible();
  if (burgerNav) { await tap('#burger'); await p.waitForTimeout(900); check('burger menu opens', await ev(() => !document.getElementById('menu').hidden)); check('focus moves into the menu', await ev(() => document.getElementById('menu').contains(document.activeElement))); await tap('.menu__links a[href$="shows.html"]'); }
  else await p.click('.nav__links a[href$="shows.html"]');
  await p.waitForTimeout(3200);
  check('nav → Shows swaps page in place', await ev(() => location.pathname.endsWith('/shows.html') && document.body.dataset.page==='shows'));
  check('music kept playing across the swap', await playing());
  if (burgerNav) check('burger menu closed after navigating', await ev(() => document.getElementById('menu').hidden));
  else check('nav marks Shows as current page', await ev(() => document.querySelector('.nav__links a[aria-current="page"]')?.textContent==='Shows'));
  check('map canvas draws land dots', await ev(() => { const c=document.querySelector('.map__canvas'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]) n++; return n>5000; }));
  check('map pins sit inside the map', await ev(() => { const m=document.querySelector('.map').getBoundingClientRect(); return [...document.querySelectorAll('.map__dot')].every(d=>{const r=d.getBoundingClientRect(); return r.left>=m.left-2&&r.right<=m.right+2&&r.top>=m.top-2&&r.bottom<=m.bottom+2;}); }));
  await tap('.map__pin[data-city="nigeria"]'); await p.waitForTimeout(1500);
  check('Lagos pin filters archive → empty state', await ev(() => !document.querySelector('[data-archive-empty]').hidden && document.querySelectorAll('.arc:not(.is-hidden)').length===0));
  check('filtered pin is highlighted', await ev(() => document.querySelector('.map__pin[data-city="nigeria"]').classList.contains('is-active')));
  await tap('.chip[data-filter="russia"]'); await p.waitForTimeout(500);
  check('Russia chip shows 3 entries', await ev(() => document.querySelectorAll('.arc:not(.is-hidden)').length===3 && /3 shows and drops in Russia/.test(document.querySelector('[data-archive-count]').textContent)));
  await tap('.chip[data-filter="all"]'); await p.waitForTimeout(400);
  await go('.arc-list', -120);
  await tap('.arc__row >> nth=1'); await p.waitForTimeout(900);
  check('archive row expands', await ev(() => { const a=document.querySelectorAll('.arc')[1]; return a.classList.contains('is-open') && a.querySelector('.arc__row').getAttribute('aria-expanded')==='true' && a.querySelector('.arc__panel').getBoundingClientRect().height > 150; }));
  await tap('.arc__row >> nth=1'); await p.waitForTimeout(900);
  check('archive row collapses', await ev(() => document.querySelectorAll('.arc')[1].querySelector('.arc__panel').getBoundingClientRect().height < 2));
  await go('#request', 0);
  await p.fill('#rqCity', 'Accra'); await tap('label[for="rq-lilcase"]'); await p.waitForTimeout(300);
  check('ticket fills in city + artist live', await ev(() => document.querySelector('[data-ticket-city]').textContent==='Accra' && document.querySelector('[data-ticket-who]').textContent==='Lilcase'));
  await tap('#requestForm button[type=submit]'); await p.waitForTimeout(200);
  check('request form: missing email is flagged', await ev(() => document.getElementById('requestMsg').classList.contains('is-error')));
  await p.fill('#rqEmail','fan@example.com'); await tap('#requestForm button[type=submit]'); await p.waitForTimeout(200);
  check('request form: valid submit confirms (prototype)', await ev(() => /Accra/.test(document.getElementById('requestMsg').textContent)));
  await p.screenshot({ path: SH+`flow-shows-${W}.png` });

  // ---------- SHOWS → WEAR ----------
  await ev(() => window.scrollTo(0,0)); await p.waitForTimeout(500);
  if (burgerNav) { await tap('#burger'); await p.waitForTimeout(900); await tap('.menu__links a[href$="wear.html"]'); } else await p.click('.nav__links a[href$="wear.html"]');
  await p.waitForTimeout(3200);
  check('nav → Wear swaps page in place', await ev(() => document.body.dataset.page==='wear'));
  check('wear hero starts light', await ev(() => document.documentElement.dataset.tone==='light'));
  await go('#design', 0);
  const side0 = await ev(() => document.querySelector('[data-tee-side]').textContent);
  await tap('[data-tee-flip]'); await p.waitForTimeout(1100);
  check('“Turn it around” flips the tee', await ev(s => document.querySelector('[data-tee-side]').textContent !== s, side0));
  await tap('label[for="tc-gold"]'); await p.waitForTimeout(800);
  check('colour swatch recolours the tee', await ev(() => document.querySelector('[data-tee]').dataset.colour==='gold' && getComputedStyle(document.querySelector('.tee__body')).fill.includes('227')));
  await tap('label[for="teeFront-wordmark"]'); await p.waitForTimeout(1100);
  check('front print change shows the front side', await ev(() => document.querySelector('[data-tee-side]').textContent==='Front' && document.querySelector('[data-tee]').dataset.front==='wordmark'));
  check('only the chosen front print is visible', await ev(() => [...document.querySelectorAll('.tee__face--front .tee__print')].filter(g=>getComputedStyle(g).opacity>0.5).map(g=>g.dataset.print).join()==='wordmark'));
  const tb2 = await p.locator('[data-tee]').boundingBox();
  if (!mobile) { await p.mouse.move(tb2.x+tb2.width/2, tb2.y+tb2.height/2); await p.mouse.down(); for(let i=1;i<=10;i++){ await p.mouse.move(tb2.x+tb2.width/2+i*30, tb2.y+tb2.height/2); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(1100);
    const deg = await ev(() => parseFloat(/rotateY\(([-\d.]+)deg\)/.exec(document.querySelector('[data-tee]').style.transform)[1]));
    check('dragging the tee turns it and snaps to a side', Math.abs(deg % 180) < 0.01 && deg !== 180, deg+'deg'); }
  await tap('#teeForm button[type=submit]'); await p.waitForTimeout(200);
  check('vote confirms the chosen design', await ev(() => /gold tee/i.test(document.getElementById('teeMsg').textContent)));
  await go('.mood', 0);
  if (!mobile) { const lb = await p.locator('.look >> nth=0').boundingBox(); await p.mouse.move(lb.x+lb.width/2, lb.y+lb.height/3); await p.waitForTimeout(400);
    check('moodboard loupe appears on hover', await ev(() => document.querySelector('.look').classList.contains('is-zoom')));
    const sl0 = await ev(() => document.querySelector('[data-strip]').scrollLeft);
    await p.mouse.down(); await p.mouse.move(lb.x+lb.width/2-300, lb.y+lb.height/3, {steps:8}); await p.mouse.up(); await p.waitForTimeout(300);
    check('moodboard strip drags sideways', await ev(s => document.querySelector('[data-strip]').scrollLeft > s, sl0));
    check('dragging the strip did not open the viewer', await ev(() => document.getElementById('lightbox').hidden)); }
  await ev(() => document.querySelector('[data-strip]').scrollLeft = 0); await p.waitForTimeout(300);
  await tap('.look >> nth=0'); await p.waitForTimeout(500);
  check('tapping a look opens the viewer', await ev(() => !document.getElementById('lightbox').hidden));
  await tap('[data-lb="close"]'); await p.waitForTimeout(200);
  await go('#first-access', 0);
  await p.fill('#dropEmail','me@example.com'); await tap('#dropForm button'); await p.waitForTimeout(200);
  check('first-access form confirms', await ev(() => /Nothing was sent/.test(document.getElementById('dropMsg').textContent)));
  await p.screenshot({ path: SH+`flow-wear-${W}.png` });

  // ---------- back to HOME, then an artist page ----------
  await p.goBack(); await p.waitForTimeout(3200);
  check('Back button returns to Shows', await ev(() => document.body.dataset.page==='shows'));
  await p.goBack(); await p.waitForTimeout(3200);
  check('Back again returns to Contact with its desk', await ev(() => document.body.dataset.page==='contact' && document.querySelector('.desk-tab[aria-selected="true"]').dataset.desk==='demo'));
  await p.goBack(); await p.waitForTimeout(3200);
  check('Back again returns home', await ev(() => document.body.dataset.page==='home' && !!document.getElementById('heroCrown')));
  const pinsBack = await ev(() => { window.scrollTo(0,0); return (() => window.ScrollTrigger ? ScrollTrigger.getAll().filter(t => t.pin).map(t => { const el = t.trigger; const top = el.getBoundingClientRect().top + scrollY; return { name: (el.className||'').toString().split(' ')[0], off: Math.round(t.start - top) }; }) : [])(); });
  check('pinned sections still start in place after returning home', pinsBack.every(x => Math.abs(x.off) <= 2), JSON.stringify(pinsBack));
  await go('.music', 0); const y0 = await ev(() => getComputedStyle(document.getElementById('crateTrack')).transform);
  await go('.music', Math.round(H*1.2)); const y1 = await ev(() => getComputedStyle(document.getElementById('crateTrack')).transform);
  if (await ev(() => document.getElementById('crate').classList.contains('is-pinned'))) check('crate pin still works after returning home', y0 !== y1);
  await go('#artists', 0);
  await tap('a.artist-row[href*="bros"]'); await p.waitForTimeout(3200);
  check('roster → Bros Throne page', await ev(() => document.body.dataset.page==='artist' && /Bros Throne/.test(document.title)));
  check('dot strip draws in artist hero', await ev(() => { const c=document.querySelector('[data-dotstrip]'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]) n++; return n>200; }));
  await go('.ap-rec-list', -100);
  await ev(() => document.getElementById('audio').pause());
  await tap('.ap-rec[data-play="how-far"] button'); await p.waitForTimeout(800);
  check('record row plays How Far', await ev(() => document.getElementById('playerTitle').textContent==='How Far') && await playing());
  check('playing record row is highlighted', await ev(() => document.querySelector('.ap-rec[data-play="how-far"]').classList.contains('is-current')));
  await go('.ap-video', 0);
  await tap('.ap-video__play'); await p.waitForTimeout(600);
  check('video loads YouTube on demand and pauses music', await ev(() => !!document.querySelector('.ap-video__frame iframe') && document.getElementById('audio').paused));
  await go('.ap-gallery', 40); await p.waitForTimeout(1300);
  check('artist photo table deals prints', await ev(() => new Set([...document.querySelectorAll('.ap-gallery .pile__card')].map(c=>c.style.transform)).size > 1));
  await go('.ap-next', 0);
  await tap('.ap-next'); await p.waitForTimeout(3200);
  check('next-artist link → Kidd Carder', await ev(() => /Kidd Carder/.test(document.title)));
  await ev(() => window.scrollTo(0,0)); await p.waitForTimeout(600);
  await tap('.ap-actions a[href*="contact.html"]'); await p.waitForTimeout(3200);
  check('“Book Kidd” opens Contact with Booking + Kidd Carder ticked', await ev(() => document.body.dataset.page==='contact' && document.querySelector('.desk-tab[aria-selected="true"]').dataset.desk==='booking' && document.getElementById('dk-kidd-carder').checked));
  check('no iframe left behind after leaving the page', await ev(() => !document.querySelector('iframe')));
  check('no console errors in the whole session', errs.length===0, errs.slice(0,3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed @${W}x${H}`);
  await b.close();
})();
