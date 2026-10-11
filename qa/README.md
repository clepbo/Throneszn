# QA

Headless browser checks for the whole site. Serve the repo root, then run:

```
npm i -D playwright && npx playwright install chromium   # once
python3 -m http.server 8765 &
node qa/qa-static.js             # every page × 6 widths + reduced motion
node qa/qa-flow.js 390x844       # drive every interaction at a size
node qa/qa-flow.js 1440x900
```

`qa-static.js` fails a page on console errors, sideways scroll, broken images or links,
duplicate ids, content left invisible after scrolling, or a pinned section that starts
scrolling before it reaches the top of the screen. `qa-flow.js` plays music, drags
photos, filters the map, fills the forms, navigates in place and checks Back/Forward.

Env: `PAGES` (comma list, e.g. `home,shows.html`, to check a subset), `BASE_URL` (default `http://localhost:8765/`), `VENDOR_DIR` (serve gsap/lenis/fonts
from a local folder when the CDNs aren't reachable), `SHOTS_DIR` for screenshots.
