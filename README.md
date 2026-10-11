# Throne Records — website redesign prototype

A static, no-build prototype of the new throneszn.com homepage. Open `index.html`
through any static server (for example `python3 -m http.server`) — audio needs
to be served over http, not opened from `file://`.

```
index.html        homepage
artists/*.html    artist pages (generated, see below)
scripts/build_artists.py  artist page generator + artist content
css/style.css     all styles (tokens at the top)
js/main.js        interactions
assets/img        client images pulled from the current site
assets/audio      How Far + Jesu (from the current site)
```

Libraries (CDN): GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13. Fonts: Big Shoulders
Display, Hanken Grotesk, Martian Mono (Google Fonts).

## Live site

Hosted on GitHub Pages from the `gh-pages` branch:
**https://clepbo.github.io/Throneszn/**

`.github/workflows/pages.yml` rebuilds the artist pages and republishes `gh-pages` on
every push to the default branch. If the site ever shows a 404, check
*Settings → Pages* is set to *Deploy from a branch → gh-pages / (root)*.

## Artist pages

`artists/bros-throne.html`, `artists/kidd-carder.html`, `artists/lilcase.html` are
generated from `index.html` (header, menu, player, footer are copied verbatim) plus the
`ARTISTS` data in `scripts/build_artists.py`. To change a bio, add a record or a new
artist, edit that data and run:

```
python3 scripts/build_artists.py
```

Each page has: a hero with a dot equalizer that reacts to the player, facts + bio,
a records list (play on-site where we have audio, otherwise YouTube), a click-to-load
video (YouTube only loads when pressed), a photo grid with a full-screen viewer, socials,
and a "next artist" link.

## Music that keeps playing

Internal links don't reload the page. `js/main.js` fetches the next page, swaps only
`<main>` behind a gold curtain, and leaves the header, player and footer alone, so a
track keeps playing while you browse. Back/forward work, deep links (`/#music`) work,
and if anything fails it falls back to a normal page load.

## What we found on the current site

- Bootstrap/owl-carousel template; hero is a stock flaming-guitar slider unrelated to the label.
- Lorem ipsum still live ("Join us" steps, album card copy), placeholder meta description ("Your description").
- Music plays through raw `<audio>` controls; one YouTube embed points at a `watch?v=` URL and is broken.
- "Portfolio" and "Artists" sections repeat the same three people.
- Stock world map for "Upcoming meets"; all events are from 2024.
- Contact details split across UK/NG numbers; management email shown with a stray space.

## Reference: mavinrecords.com

Black + gold, full-screen logo video hero, transparent sticky nav, oversized lowercase
section titles, artist photo grid (name bottom-left), rounded cover grid that links
out to lnk.to, slide-up reveals, a "fly" hover lift, minimal footer.

## What this prototype does differently

| Moment | Interaction |
| --- | --- |
| Loader | The dot-matrix crown from the logo builds itself dot by dot with a 000→100 counter (click to skip). |
| Hero | The crown is a live **audio visualizer**: press play and its columns react to the track's frequencies (bass in the centre spike). Dots also push away from the cursor. |
| Persistent player | Music plays on-site in a bottom bar that survives scrolling (play/pause, seek, next, Media Session metadata). Mavin always sends you off-site. |
| Manifesto | Words light up as you scroll through them; key words turn gold. |
| Light + dark | Sections alternate between the black stage and warm paper (`data-tone`), and the page fades between them as you scroll. Player, menu and overlays always stay black. |
| Photo trail | Moving the cursor (or dragging a finger) across "Dreamers. Believers. Truth-tellers. Ground shakers." drops a trail of artist photos. |
| Zoom | A studio shot grows from a small card to full screen as you scroll, with the words pulling apart. |
| Photo table | Polaroid prints you can drag and throw (with inertia and bounce), Shuffle or Tidy into a grid; tap opens full screen; they pulse to the music. Also on every artist page. |
| Roster | Giant names; hover fills the row gold, rolls the name, and a portrait follows the cursor. Click opens the artist's page. Mobile shows inline thumbnails. |
| New music | A pinned horizontal "crate" on desktop (scroll moves records sideways, skewing with velocity); swipe on touch. Hover slides the vinyl out of the sleeve; the playing record spins. |
| Featured | Big God SZN with a spinning disc that parallaxes out from behind the cover. |
| Shows | Rows sweep in a surface on hover with an image peeking beside the cursor. |
| Wear | 3D tilt cards with a light glare; drop sign-up. |
| Cities | Live local time in Lagos, Moscow and London. |
| Contact | Topic chips (Booking / Demo / Press), floating labels, click-to-copy details. |
| Footer | Outlined THRONE wordmark lit by a cursor spotlight. |

Custom cursor with contextual labels (Play / View / Watch), magnetic buttons, smooth
scroll, film grain. Everything respects `prefers-reduced-motion` and falls back to a
plain, fully readable page if the libraries fail to load.

## Open items for the client

- Audio only exists for **How Far** and **Jesu**; other records link to YouTube. We need masters/previews (or Spotify/Apple links) for the rest.
- Cover art is missing for Neighborhood Hero, Blessed, Lonely and G63 — they use typographic placeholder sleeves.
- Higher-res artist photography, full bios for Kidd Carder and Lilcase, and Lilcase's socials.
- Confirm the management email (`thronerecordsmanagement@gmail.com` is our reading of the current site) and which phone numbers to publish.
- 2026 show dates, and whether Throne Wear has a store yet (forms currently do not submit).
- Vector logo files.
