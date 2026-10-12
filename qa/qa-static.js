// Static QA: every page × widths (+ reduced motion): errors, overflow, images, links, ids, hidden content.
const { chromium } = require('playwright');
const V = process.env.VENDOR_DIR; // optional: serve CDN scripts from a local folder (offline/sandboxed runs)
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const PAGES=(process.env.PAGES ? process.env.PAGES.split(',') : ['', 'artists/bros-throne.html', 'artists/kidd-carder.html', 'artists/lilcase.html', 'shows.html', 'wear.html', 'contact.html']).map(x => x === 'home' ? '' : x);
const WIDTHS=[[360,740],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]];
const fontCache={};
async function setup(ctx){
  if (V) await ctx.route(/cdnjs|jsdelivr/, r => { const u=r.request().url(); const f=u.includes('ScrollTrigger')?'ScrollTrigger.min.js':u.includes('lenis')?'lenis.min.js':'gsap.min.js'; r.fulfill({path:V+f, contentType:'application/javascript'}); });
  if (V) await ctx.route(/fonts\.(googleapis|gstatic)/, r => { const u=r.request().url(); if(!fontCache[u]) fontCache[u]=require('child_process').execFileSync('curl',['-s','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',u]); r.fulfill({body:fontCache[u], contentType: u.includes('css2')?'text/css':'font/woff2'}); });
  await ctx.route(/youtube|ytimg/, r => r.abort());
}
(async () => {
  const b = await chromium.launch();
  const fails=[]; const linkSet=new Set();
  const runs=[];
  for (const pg of PAGES) for (const [w,h] of WIDTHS) runs.push({pg,w,h,reduced:false});
  for (const pg of PAGES) for (const [w,h] of [[390,844],[1440,900]]) runs.push({pg,w,h,reduced:true});
  for (const r of runs) {
    const mobile = r.w < 700;
    const ctx = await b.newContext({ viewport:{width:r.w,height:r.h}, hasTouch:mobile, isMobile:mobile, reducedMotion: r.reduced?'reduce':'no-preference' });
    await setup(ctx);
    const p = await ctx.newPage();
    const errs=[];
    p.on('console', m => { if (m.type()==='error' && !/ERR_FAILED|youtube/.test(m.text())) errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERR '+e.message));
    const tag = `${r.pg||'home'} @${r.w}${r.reduced?' reduced':''}`;
    await p.goto(BASE+r.pg, { waitUntil:'networkidle' });
    await p.waitForTimeout(2600);
    // every pinned section must start exactly where its section starts
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    const pinOff = await p.evaluate(() => (() => window.ScrollTrigger ? ScrollTrigger.getAll().filter(t => t.pin).map(t => { const el = t.trigger; const top = el.getBoundingClientRect().top + scrollY; return { name: (el.className||'').toString().split(' ')[0], off: Math.round(t.start - top) }; }) : [])());
    // scroll the whole page in steps so every reveal fires
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y=0; y<=H; y+=Math.round(r.h*0.6)) { await p.evaluate(y=>window.scrollTo(0,y), y); await p.waitForTimeout(140); }
    await p.waitForTimeout(1500);
    const res = await p.evaluate((W) => {
      const out = {};
      out.scrollW = document.documentElement.scrollWidth;
      const wide = [...document.querySelectorAll('main *, footer *, header *')].filter(el => { const rc = el.getBoundingClientRect(); const cs=getComputedStyle(el); return rc.right > W + 1 && rc.width > 0 && cs.position!=='fixed' && !el.closest('.crate,.mood__strip,.desk-tabs,.ticker,.footer__word,.zoom,.trail,.pile,.hero,.ap-next'); }).slice(0,5).map(el => el.tagName+'.'+el.className.toString().slice(0,40)+' r='+Math.round(el.getBoundingClientRect().right));
      out.wide = wide;
      const ids = [...document.querySelectorAll('[id]')].map(e=>e.id); out.dupIds = ids.filter((x,i)=>ids.indexOf(x)!==i);
      out.badImgs = [...document.querySelectorAll('img')].filter(i => i.getAttribute('src') && i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'));
      out.pending = [...document.querySelectorAll('main img')].filter(i => !i.complete).length;
      out.links = [...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>h.startsWith(location.origin));
      // content that stayed invisible after scrolling (stuck reveal)
      const skip = '.look__lens, .trail__img, .cursor, .cursor *, .artist-float, .show-peek, .curtain, .curtain *, .lightbox, .lightbox *, .menu, .menu *, .roll::after, .tee__print, .arc__panel *, .record__play, .zoom__line, .sr-only, .toast, .loader, .loader *, [hidden], [hidden] *';
      out.invisible = [...document.querySelectorAll('main h1, main h2, main h3, main p, main img, main button, main a, main li, main dt, main dd')].filter(el => {
        if (el.matches(skip) || el.closest('[hidden], .arc:not(.is-open) .arc__panel, .is-hidden')) return false;
        const rc = el.getBoundingClientRect(); if (rc.width < 2 || rc.height < 2) return false;
        let n = el, op = 1; while (n && n !== document.body) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
        return op < 0.05;
      }).slice(0,6).map(el => el.tagName+'.'+(el.className||'').toString().slice(0,30)+' "'+(el.textContent||'').trim().slice(0,24)+'"');
      out.loader = !!document.getElementById('loader');
      out.loading = document.body.classList.contains('is-loading');
      return out;
    }, r.w);
    res.links.forEach(l=>linkSet.add(l.split('#')[0]));
    const problems=[];
    if (errs.length) problems.push('console: '+errs.slice(0,3).join(' | '));
    if (res.scrollW > r.w) problems.push(`horizontal overflow ${res.scrollW}>${r.w} ${res.wide.join(', ')}`);
    else if (res.wide.length) problems.push('elements past edge: '+res.wide.join(', '));
    if (res.dupIds.length) problems.push('duplicate ids: '+res.dupIds.join(','));
    if (res.badImgs.length) problems.push('broken images: '+res.badImgs.join(','));
    if (res.invisible.length) problems.push('stuck invisible: '+res.invisible.join(', '));
    if (res.loader || res.loading) problems.push('loader still present');
    // and every 'top N%' trigger must start where its element really is
    const trigOff = await p.evaluate(() => {
      if (!window.ScrollTrigger) return [];
      window.scrollTo(0, 0);
      return ScrollTrigger.getAll().map(t => {
        const m = /^top (top|bottom|center|(\d+)%)$/.exec(t.vars.start || '');
        if (!m || !t.trigger || t.pin) return null;
        const frac = m[1] === 'top' ? 0 : m[1] === 'bottom' ? 1 : m[1] === 'center' ? 0.5 : +m[2] / 100;
        const want = t.trigger.getBoundingClientRect().top + scrollY - frac * innerHeight;
        const expected = Math.max(0, Math.min(want, ScrollTrigger.maxScroll(window)));
        return { name: (t.trigger.className || t.trigger.tagName).toString().split(' ')[0], off: Math.round(t.start - expected) };
      }).filter(x => x && Math.abs(x.off) > 3);
    });
    const badPins = pinOff.filter(x => Math.abs(x.off) > 2);
    if (badPins.length) problems.push('pinned section starts in the wrong place: '+badPins.map(x => `${x.name} off by ${x.off}px`).join(', '));
    if (trigOff.length) problems.push('scroll animations start in the wrong place: '+trigOff.slice(0,5).map(x => `${x.name} off by ${x.off}px`).join(', '));
    console.log((problems.length?'FAIL ':'ok   ')+tag+(problems.length?'\n      '+problems.join('\n      '):''));
    if (problems.length) fails.push(tag);
    if ((r.w===390||r.w===1440) && !r.reduced) { await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(600); await p.screenshot({path:`${require('os').tmpdir()}/qa-${(r.pg||'home').replace(/\W/g,'_')}-${r.w}.png`}); }
    await ctx.close();
  }
  // link check
  const bad=[];
  for (const l of linkSet) { const res = await fetch(l).catch(()=>null); if (!res || res.status!==200) bad.push(l+' '+(res&&res.status)); }
  console.log(bad.length? 'FAIL links: '+bad.join(', ') : `ok   ${linkSet.size} internal links resolve`);
  console.log(`\n${fails.length} failing runs of ${runs.length}`);
  await b.close();
})();
