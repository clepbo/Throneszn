#!/usr/bin/env python3
"""Generate every page except the homepage from index.html.

The header, menu, player and footer are copied from index.html so every page
shares identical chrome; only <main> differs. Builds:

    artists/<slug>.html   one per entry in ARTISTS
    shows.html            map, archive (SHOWS) and city requests
    wear.html             Throne Wear: tee designer, moodboard (LOOKS), sign-up
    contact.html          desks (DESKS), live letter, bases, follow the roster

Edit the data below (or index.html's chrome), then run:

    python3 scripts/build_pages.py
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "artists"

YT = "https://www.youtube.com/@BrosThrone"

ARTISTS = [
    {
        "slug": "bros-throne",
        "index": "A/01",
        "name": ["Bros", "Throne"],
        "role": "Artist · Founder & CEO",
        "portrait": "portfolio_bros_throne.jpg",
        "hero": "featured_fet1_1.jpg",
        "lede": "Edo-born, Russia-based, and the founder of Throne Records. Bros Throne moves between Afrobeats bounce and ghetto gospel testimony.",
        "play": {"id": "how-far", "label": "Play How Far"},
        "facts": [
            ("Real name", "Ogbe Japhet"),
            ("From", "Edo State, Nigeria"),
            ("Based", "Russia"),
            ("Role", "Founder & CEO, Throne Records (2021)"),
            ("Also", "Studying management"),
        ],
        "statement": "Times were changing. Clothes were changing. Morals were changing. Big God SZN never changed.",
        "bio": [
            "Ogbe Japhet started Throne Records in 2021 as more than a label: a home for music, lifestyle and fashion that could connect Nigeria, Russia and the UK.",
            "As Bros Throne, Ogbe leads the roster from the front. The catalogue runs from the street-level Afrobeats of How Far and G63 to the ghetto gospel of Jesu and Big God, with features from ODUMODUBLVCK, Zlatan Ibile, Blaq Bonez and labelmate Lilcase. The debut EP, Big God SZN, launched in June 2024.",
        ],
        "records": [
            ("How Far", "", "Afrobeats", {"play": "how-far"}),
            ("Jesu", "", "Ghetto gospel", {"play": "jesu"}),
            ("Big God SZN", "Debut EP · 2024", "EP", {"href": YT}),
            ("Big God", "ft. Lilcase", "Ghetto gospel", {"href": "https://www.youtube.com/watch?v=3StHfn7EThA"}),
            ("ASAP", "ft. Blaq Bonez", "Afrobeats", {"href": YT}),
            ("Reckless", "ft. ODUMODUBLVCK", "Afrobeats", {"href": YT}),
            ("Neighborhood Hero", "ft. Zlatan Ibile", "Afrobeats", {"href": YT}),
            ("Blessed", "", "Afrobeats", {"href": YT}),
            ("Lonely", "", "Afrobeats", {"href": YT}),
            ("G63", "", "Afrobeats", {"href": YT}),
        ],
        "video": {"id": "3StHfn7EThA", "title": "Big God (feat. Lilcase)", "poster": "event_big1.jpg"},
        "gallery": [
            ("featured_fet1_2.jpg", "Bros Throne in a pinstripe suit, black and white"),
            ("artist_bros.jpg", "Bros Throne performing live"),
            ("banner_b2.jpg", "Bros Throne on the phone in the studio"),
            ("featured_fet1_1.jpg", "Bros Throne portrait"),
            ("cloths_product2.jpg", "Bros Throne on stage"),
        ],
        "links": [
            ("Instagram", "https://www.instagram.com/brosthrone"),
            ("YouTube", YT),
            ("X", "https://x.com/brosthrone"),
            ("Facebook", "https://www.facebook.com/brosthrone"),
            ("Snapchat", "https://www.snapchat.com/add/brosthrone"),
        ],
    },
    {
        "slug": "kidd-carder",
        "index": "A/02",
        "name": ["Kidd", "Carder"],
        "role": "Artist · Songwriter",
        "portrait": "portfolio_kid22.jpg",
        "hero": "featured_fet_kid1.jpg",
        "lede": "A songwriter first. Kidd Carder writes and performs for the Throne roster, and the single Calculate is out now.",
        "play": {"href": "https://www.youtube.com/watch?v=WiEGWS180w0", "label": "Watch Calculate"},
        "facts": [
            ("Role", "Artist & songwriter"),
            ("Label", "Throne Records"),
            ("Latest", "Calculate"),
            ("YouTube", "@Kiddcarder"),
        ],
        "statement": "Our artists redefine genres. Kidd Carder writes the songs that do it.",
        "bio": [
            "Kidd Carder brings a songwriter’s ear to Throne Records, writing for the label and stepping out front as an artist too.",
            "Calculate, the latest single, is out now on YouTube. A full biography is on its way.",
        ],
        "records": [
            ("Calculate", "", "Single", {"href": "https://www.youtube.com/watch?v=WiEGWS180w0"}),
        ],
        "video": {"id": "WiEGWS180w0", "title": "Kidd Carder — Calculate", "poster": "featured_fet_kid1.jpg"},
        "gallery": [
            ("artist_kid11.jpg", "Kidd Carder seated in a camo jacket"),
            ("portfolio_kid22.jpg", "Kidd Carder in a varsity jacket"),
            ("featured_fet_kid1.jpg", "Kidd Carder portrait"),
        ],
        "links": [("YouTube", "https://www.youtube.com/@Kiddcarder")],
    },
    {
        "slug": "lilcase",
        "index": "A/03",
        "name": ["Lilcase"],
        "role": "Singer · Artist",
        "portrait": "portfolio_lil_case.jpg",
        "hero": "artist_lil_case.jpg",
        "lede": "The voice on Big God. Lilcase sings for Throne Records and carries the label’s ghetto gospel lead single.",
        "play": {"href": "https://www.youtube.com/watch?v=3StHfn7EThA", "label": "Watch Big God"},
        "facts": [
            ("Stage name", "Lilcase"),
            ("Role", "Singer & artist"),
            ("Label", "Throne Records"),
            ("Featured on", "Big God (Bros Throne ft. Lilcase)"),
            ("Released", "01·08·2023"),
        ],
        "statement": "Our artists define generations. Lilcase gives the crown its voice.",
        "bio": [
            "Lilcase is one of the core singers on Throne Records. Lilcase features on Big God, the lead single from Bros Throne’s debut EP Big God SZN.",
            "New solo music is in the works. A full biography is on its way.",
        ],
        "records": [
            ("Big God", "Bros Throne ft. Lilcase", "Ghetto gospel", {"href": "https://www.youtube.com/watch?v=3StHfn7EThA"}),
        ],
        "video": {"id": "3StHfn7EThA", "title": "Big God (feat. Lilcase)", "poster": "event_big1.jpg"},
        "gallery": [
            ("artist_lil_case.jpg", "Lilcase seated in a leather armchair"),
            ("portfolio_lil_case.jpg", "Lilcase in the studio"),
            ("event_big1.jpg", "Big God SZN cover art"),
        ],
        "links": [],
    },
]

E = html.escape


def record_row(i, rec):
    title, feat, kind, act = rec
    feat_html = f'<span class="ap-rec__feat">{E(feat)}</span>' if feat else ""
    if "play" in act:
        action = (f'<button class="ap-rec__act" type="button" data-play="{act["play"]}" aria-label="Play {E(title)}">'
                  f'<svg><use href="#i-play"/></svg></button>')
        cursor = "Play"
        tag, attrs = "div", f' data-play="{act["play"]}"'
    else:
        action = '<span class="ap-rec__act ap-rec__act--out" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>'
        cursor = "Watch"
        tag, attrs = "a", f' href="{E(act["href"])}" target="_blank" rel="noopener"'
    return (f'      <li><{tag} class="ap-rec"{attrs} data-cursor="{cursor}">'
            f'<span class="ap-rec__idx">{i:02d}</span>'
            f'<span class="ap-rec__title">{E(title)}{feat_html}</span>'
            f'<span class="ap-rec__kind">{E(kind)}</span>{action}</{tag}></li>')


def build_main(a, nxt):
    name_full = " ".join(a["name"])
    lines = "".join(f'<span class="ap-line"><span>{E(w)}</span></span>' for w in a["name"])
    play = a["play"]
    if "id" in play:
        cta = (f'<button class="btn btn--gold" type="button" data-play="{play["id"]}" data-magnetic data-cursor="Play">'
               f'<svg><use href="#i-play"/></svg> {E(play["label"])}</button>')
    else:
        cta = (f'<a class="btn btn--gold" href="{E(play["href"])}" target="_blank" rel="noopener" data-magnetic data-cursor="Watch">'
               f'{E(play["label"])} <svg><use href="#i-arrow"/></svg></a>')
    facts = "\n".join(f'      <div><dt>{E(k)}</dt><dd>{E(v)}</dd></div>' for k, v in a["facts"])
    bio = "\n".join(f'      <p>{E(p)}</p>' for p in a["bio"])
    records = "\n".join(record_row(i + 1, r) for i, r in enumerate(a["records"]))
    total = len(a["gallery"])
    gallery = "\n".join(
        f'      <button class="pile__card" type="button" data-cursor="Drag">'
        f'<img src="../assets/img/{src}" alt="{E(alt)}" loading="lazy" draggable="false">'
        f'<span class="pile__cap"><b>{E(name_full)}</b><span>{i + 1:02d} / {total:02d}</span></span></button>'
        for i, (src, alt) in enumerate(a["gallery"]))
    if a["links"]:
        links = "\n".join(f'      <li><a href="{E(h)}" target="_blank" rel="noopener" data-magnetic>{E(l)} <svg><use href="#i-arrow"/></svg></a></li>'
                          for l, h in a["links"])
        links_html = f'    <ul class="ap-links">\n{links}\n    </ul>'
    else:
        links_html = '    <p class="ap-connect__note">Socials coming soon. For now, reach Lilcase through the label.</p>'
    v = a["video"]
    nxt_name = " ".join(nxt["name"])
    return f'''<main id="top" data-page="artist" data-title="{E(name_full)}">

  <section class="ap-hero" data-tone="dark">
    <div class="ap-hero__text">
      <a class="ap-back" href="../#artists" data-magnetic>← The roster</a>
      <p class="eyebrow">{E(a["index"])} · {E(a["role"])}</p>
      <h1 class="ap-name" aria-label="{E(name_full)}">{lines}</h1>
      <p class="ap-lede">{E(a["lede"])}</p>
      <div class="ap-actions">
        {cta}
        <a class="btn btn--ghost" href="../contact.html?desk=booking&amp;artist={a["slug"]}" data-magnetic>Book {E(a["name"][0])}</a>
      </div>
    </div>
    <figure class="ap-hero__img">
      <img src="../assets/img/{a["hero"]}" alt="{E(name_full)}">
    </figure>
    <canvas class="dotstrip" data-dotstrip aria-hidden="true"></canvas>
  </section>

  <section class="ap-about" data-tone="light">
    <p class="ap-statement" data-scrub>{E(a["statement"])}</p>
    <div class="ap-about__grid">
      <dl class="ap-facts">
{facts}
      </dl>
      <div class="ap-bio">
{bio}
      </div>
    </div>
  </section>

  <section class="ap-records" data-tone="light">
    <div class="section-head">
      <h2 class="section-title" data-split>Records</h2>
      <p class="section-note">{len(a["records"])} {"release" if len(a["records"]) == 1 else "releases"}. Play here or watch on YouTube.</p>
    </div>
    <ol class="ap-rec-list">
{records}
    </ol>
  </section>

  <section class="ap-video" data-tone="dark">
    <p class="eyebrow">Watch</p>
    <div class="ap-video__frame" data-video="{v["id"]}" data-video-title="{E(v["title"])}">
      <img src="../assets/img/{v["poster"]}" alt="">
      <button class="ap-video__play" type="button" data-cursor="Play" aria-label="Play video: {E(v["title"])}">
        <span class="ap-video__btn"><svg><use href="#i-play"/></svg></span>
        <span class="ap-video__title">{E(v["title"])}</span>
      </button>
    </div>
  </section>

  <section class="ap-gallery" data-tone="light">
    <div class="section-head">
      <h2 class="section-title" data-split>In frame</h2>
      <p class="section-note">Grab a photo and throw it. Tap one to see it full size.</p>
    </div>
    <div class="pile pile--small" data-pile>
{gallery}
    </div>
    <div class="pile__tools">
      <button class="btn btn--ghost" type="button" data-pile-shuffle data-magnetic>Shuffle</button>
      <button class="btn btn--ghost" type="button" data-pile-tidy data-magnetic>Tidy up</button>
      <span class="pile__count">{total:02d} photos</span>
    </div>
  </section>

  <section class="ap-connect" data-tone="light">
    <h2 class="ap-connect__title" data-split>Follow {E(a["name"][0])}</h2>
{links_html}
  </section>

  <a class="ap-next" href="{nxt["slug"]}.html" data-cursor="Next" data-tone="dark">
    <span class="eyebrow">Next artist</span>
    <span class="ap-next__name">{E(nxt_name)}</span>
    <span class="ap-next__img"><img src="../assets/img/{nxt["portrait"]}" alt=""></span>
  </a>
</main>'''


# ---------------------------------------------------------------------------
# Shows
# ---------------------------------------------------------------------------

# country keys match the map pins: nigeria (Lagos), russia (Moscow), uk (UK office, West Midlands)
SHOWS = [
    {
        "date": "2024-06-29", "day": "29", "month": "Jun 2024",
        "title": "Afro Music Live in Moscow", "place": "Moscow, RU", "country": "russia",
        "tag": "Played", "kind": "Live show",
        "img": "artist_bros.jpg", "img_alt": "Bros Throne performing live",
        "text": "An Afro music night in Moscow, bringing the Throne Records sound to a live room.",
        "credit": "Photo: Bros Throne live",
    },
    {
        "date": "2024-06-07", "day": "07", "month": "Jun 2024",
        "title": "Big God SZN — EP launch", "place": "Russia", "country": "russia",
        "tag": "Released", "kind": "EP launch",
        "img": "event_big1.jpg", "img_alt": "Big God SZN cover art",
        "text": "Times were changing. Clothes were changing. Morals were changing. Big God SZN never changed. The debut EP from Bros Throne.",
        "link": ("Watch on YouTube", YT),
    },
    {
        "date": "2024-04-19", "day": "19", "month": "Apr 2024",
        "title": "ASAP ft. Blaq Bonez", "place": "Russia", "country": "russia",
        "tag": "Released", "kind": "Single",
        "img": "event_blaq_event1.jpg", "img_alt": "ASAP single artwork",
        "text": "A new record collaboration between Bros Throne and Blaq Bonez.",
        "link": ("Watch on YouTube", YT),
    },
]

CITIES = [
    # key, label, note, lat, lon
    ("nigeria", "Lagos", "Roots", 6.52, 3.38),
    ("russia", "Moscow", "Studio & shows", 55.75, 37.62),
    ("uk", "UK", "Label office", 52.58, -1.98),
]


def build_shows_main():
    mask = (ROOT / "scripts" / "world_mask.txt").read_text().strip()
    counts = {k: sum(1 for x in SHOWS if x["country"] == k) for k, *_ in CITIES}
    pins = "\n".join(
        f'      <button class="map__pin" type="button" data-city="{k}" data-lat="{lat}" data-lon="{lon}" data-cursor="Filter" '
        f'aria-label="{E(label)}: {counts[k]} archived {"show" if counts[k] == 1 else "shows"}">'
        f'<span class="map__dot" aria-hidden="true"></span>'
        f'<span class="map__label">{E(label)}<small>{E(note)}</small></span></button>'
        for k, label, note, lat, lon in CITIES)
    filters = '<button type="button" class="chip" data-filter="all" aria-pressed="true">All <span>' + f'{len(SHOWS):02d}</span></button>\n' + "\n".join(
        f'        <button type="button" class="chip" data-filter="{k}" aria-pressed="false">{E(country)} <span>{counts[k]:02d}</span></button>'
        for (k, *_), country in zip(CITIES, ["Nigeria", "Russia", "UK"]))
    rows = []
    for i, x in enumerate(SHOWS):
        link = f'<a class="btn btn--gold" href="{E(x["link"][1])}" target="_blank" rel="noopener">{E(x["link"][0])} <svg><use href="#i-arrow"/></svg></a>' if x.get("link") else ""
        credit = f'<p class="arc__credit">{E(x["credit"])}</p>' if x.get("credit") else ""
        rows.append(f"""      <li class="arc" data-country="{x["country"]}" data-img="assets/img/{x["img"]}">
        <button class="arc__row" type="button" aria-expanded="false" aria-controls="arc-{i}">
          <time class="arc__date" datetime="{x["date"]}"><b>{x["day"]}</b> {E(x["month"])}</time>
          <span class="arc__title">{E(x["title"])}</span>
          <span class="arc__place">{E(x["place"])}</span>
          <span class="arc__tag">{E(x["tag"])}</span>
          <span class="arc__plus" aria-hidden="true"></span>
        </button>
        <div class="arc__panel" id="arc-{i}">
          <div class="arc__inner">
            <figure class="arc__img"><img src="assets/img/{x["img"]}" alt="{E(x["img_alt"])}" loading="lazy">{credit}</figure>
            <div class="arc__body">
              <p class="eyebrow">{E(x["kind"])}</p>
              <p class="arc__text">{E(x["text"])}</p>
              <dl class="arc__facts"><div><dt>Date</dt><dd>{x["day"]} {E(x["month"])}</dd></div><div><dt>Where</dt><dd>{E(x["place"])}</dd></div></dl>
              {link}
            </div>
          </div>
        </div>
      </li>""")
    artists = "\n".join(
        f'        <input type="checkbox" name="rqArtist" id="rq-{a["slug"]}" value="{E(" ".join(a["name"]))}"><label for="rq-{a["slug"]}">{E(" ".join(a["name"]))}</label>'
        for a in ARTISTS)
    return f"""<main id="top" data-page="shows">

  <section class="pg-hero pg-hero--shows" data-tone="dark">
    <div class="pg-hero__text">
      <p class="eyebrow">Shows &amp; drops</p>
      <h1 class="pg-title" aria-label="On the road"><span class="ap-line"><span>On the</span></span><span class="ap-line"><span>road</span></span></h1>
      <p class="pg-lede">Three home bases, one sound. The 2026 dates are being booked now. Until they land, here is where Throne has been. Tap a city on the map.</p>
      <div class="ap-actions">
        <a class="btn btn--gold" href="#request" data-magnetic>Bring Throne to your city</a>
        <a class="btn btn--ghost" href="contact.html?desk=booking" data-magnetic>Book an artist</a>
      </div>
    </div>
    <div class="map" data-map data-mask="{mask}">
      <canvas class="map__canvas" aria-hidden="true"></canvas>
{pins}
    </div>
  </section>

  <section class="archive" id="archive" data-tone="light">
    <div class="section-head">
      <h2 class="section-title" data-split>The archive</h2>
      <p class="section-note" data-archive-count aria-live="polite">{len(SHOWS)} shows and drops</p>
    </div>
    <div class="chips" role="group" aria-label="Filter by country">
        {filters}
    </div>
    <ol class="arc-list">
{chr(10).join(rows)}
    </ol>
    <p class="arc-empty" data-archive-empty hidden>Nothing in the archive here yet. Ask for a date below and we will take it to the label.</p>
  </section>

  <section class="request" id="request" data-tone="dark">
    <div class="request__copy">
      <h2 class="section-title" data-split>Bring Throne to your city</h2>
      <p class="request__text">Tell us where you are and who you want to see. Requests help decide where the 2026 dates land.</p>
      <form class="request__form" id="requestForm" novalidate>
        <div class="field"><input id="rqCity" type="text" placeholder=" " autocomplete="address-level2" maxlength="28" required><label for="rqCity">Your city</label></div>
        <fieldset class="topics">
          <legend>Who do you want to see?</legend>
{artists}
        </fieldset>
        <div class="field"><input id="rqEmail" type="email" placeholder=" " autocomplete="email" required><label for="rqEmail">Email for the announcement</label></div>
        <button class="btn btn--gold btn--wide" type="submit" data-magnetic>Send request <svg><use href="#i-arrow"/></svg></button>
        <p class="form-msg" id="requestMsg" role="status"></p>
      </form>
    </div>
    <div class="ticket-wrap" aria-hidden="true">
      <div class="ticket" data-ticket>
        <div class="ticket__main">
          <p class="ticket__k">Throne Records presents</p>
          <p class="ticket__city" data-ticket-city>Your city</p>
          <p class="ticket__who" data-ticket-who>The whole roster</p>
          <div class="ticket__row"><span>2026</span><span>Date TBA</span><span>Admit one</span></div>
        </div>
        <div class="ticket__stub">
          <svg class="ticket__crown" viewBox="0 0 38 22"><use href="#crownMark"/></svg>
          <span class="ticket__code" data-ticket-code>TR-0000</span>
        </div>
      </div>
      <p class="ticket__note">Your ticket updates as you type.</p>
    </div>
  </section>
</main>"""


# ---------------------------------------------------------------------------
# Throne Wear
# ---------------------------------------------------------------------------

LOOKS = [
    ("featured_fet1_1.jpg", "Bros Throne", "Pinstripes"),
    ("artist_kid11.jpg", "Kidd Carder", "Camo"),
    ("cloths_product1.jpg", "Throne Wear", "Look 01"),
    ("portfolio_kid22.jpg", "Kidd Carder", "Varsity"),
    ("artist_lil_case.jpg", "Lilcase", "Studio"),
    ("featured_fet1_2.jpg", "Bros Throne", "Black tie"),
    ("cloths_product2.jpg", "Bros Throne", "Stage"),
    ("featured_fet_kid1.jpg", "Kidd Carder", "Chains"),
]

TEE_PATH = "M140 22 Q200 70 260 22 L330 46 L392 118 L342 166 L312 140 L312 444 L88 444 L88 140 L58 166 L8 118 L70 46 Z"
TEE_BACK = "M140 22 Q200 44 260 22 L330 46 L392 118 L342 166 L312 140 L312 444 L88 444 L88 140 L58 166 L8 118 L70 46 Z"


def tee_face(side):
    path = TEE_PATH if side == "front" else TEE_BACK
    collar = "M140 22 Q200 70 260 22" if side == "front" else "M140 22 Q200 44 260 22"
    if side == "front":
        prints = """
          <g class="tee__print" data-print="crown"><use href="#crownMark" x="150" y="140" width="100" height="58"/></g>
          <g class="tee__print" data-print="wordmark"><text x="200" y="196" text-anchor="middle" class="tee__type" font-size="62">THRONE</text></g>
          <g class="tee__print" data-print="bgs"><text x="200" y="178" text-anchor="middle" class="tee__type" font-size="54">BIG GOD</text><text x="200" y="228" text-anchor="middle" class="tee__type" font-size="54">SZN</text></g>"""
    else:
        prints = """
          <g class="tee__print" data-print="cities"><use href="#crownMark" x="176" y="96" width="48" height="28"/><text x="200" y="178" text-anchor="middle" class="tee__type" font-size="46">LAGOS</text><text x="200" y="226" text-anchor="middle" class="tee__type" font-size="46">MOSCOW</text><text x="200" y="274" text-anchor="middle" class="tee__type" font-size="46">UK</text></g>
          <g class="tee__print" data-print="bgs"><text x="200" y="200" text-anchor="middle" class="tee__type" font-size="92">BIG GOD</text><text x="200" y="286" text-anchor="middle" class="tee__type" font-size="92">SZN</text></g>
          <g class="tee__print" data-print="wordmark"><text x="200" y="250" text-anchor="middle" class="tee__type" font-size="96">THRONE</text></g>"""
    return f"""        <svg class="tee__face tee__face--{side}" viewBox="0 0 400 460" role="img" aria-label="Tee, {side}">
          <defs>
            <linearGradient id="fold-{side}" x1="0" x2="1">
              <stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>
              <stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/>
            </linearGradient>
          </defs>
          <path class="tee__body" d="{path}"/>
          {prints}
          <path d="{path}" fill="url(#fold-{side})"/>
          <path class="tee__collar" d="{collar}"/>
          <path class="tee__rim" d="{path}"/>
        </svg>"""


def build_wear_main():
    looks = "\n".join(
        f'      <button class="look" type="button" data-cursor="Zoom">'
        f'<span class="look__frame"><img src="assets/img/{src}" alt="{E(who)}, {E(what)}" loading="lazy" draggable="false"><span class="look__lens" aria-hidden="true"></span></span>'
        f'<span class="look__cap"><b>{E(who)}</b><span>{E(what)}</span></span></button>'
        for src, who, what in LOOKS)
    def radios(name, opts, checked):
        return "\n".join(
            f'          <input type="radio" name="{name}" id="{name}-{v}" value="{v}"{" checked" if v == checked else ""}><label for="{name}-{v}">{E(l)}</label>'
            for v, l in opts)
    return f"""<main id="top" data-page="wear">

  <section class="pg-hero pg-hero--wear" data-tone="light">
    <div class="pg-hero__text">
      <p class="eyebrow">Throne Wear · Capsule 01</p>
      <h1 class="pg-title" aria-label="Dress like the crown"><span class="ap-line"><span>Dress like</span></span><span class="ap-line"><span>the crown</span></span></h1>
      <p class="pg-lede">Music, lifestyle and fashion have always been one thing at Throne. The first capsule is in the works, and you can help shape it.</p>
      <div class="ap-actions">
        <a class="btn btn--gold" href="#design" data-magnetic>Design the first drop</a>
        <a class="btn btn--ghost" href="#first-access" data-magnetic>Get first access</a>
      </div>
    </div>
    <div class="wear-hero__looks">
      <figure class="wear-hero__a"><img src="assets/img/cloths_product1.jpg" alt="Throne Wear, look 01"></figure>
      <figure class="wear-hero__b"><img src="assets/img/cloths_product2.jpg" alt="Bros Throne on stage"></figure>
      <svg class="badge" viewBox="0 0 200 200" aria-hidden="true">
        <defs><path id="badgeCircle" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0"/></defs>
        <circle cx="100" cy="100" r="96" class="badge__bg"/>
        <text class="badge__text"><textPath href="#badgeCircle">Capsule 01 · in the works · Capsule 01 · in the works ·</textPath></text>
        <use href="#crownMark" x="72" y="84" width="56" height="32" class="badge__crown"/>
      </svg>
    </div>
  </section>

  <section class="studio" id="design" data-tone="dark">
    <div class="section-head">
      <h2 class="section-title" data-split>Design the first drop</h2>
      <p class="section-note">Pick a colour and prints. Drag the tee to turn it. Your pick is a vote for what we make first.</p>
    </div>
    <div class="studio__grid">
      <div class="tee-stage" data-tee-stage>
        <div class="tee" data-tee data-colour="ink" data-front="crown" data-back="cities" data-cursor="Drag">
{tee_face("front")}
{tee_face("back")}
        </div>
        <p class="tee-stage__side" data-tee-side>Front</p>
      </div>
      <form class="studio__controls" id="teeForm" novalidate>
        <fieldset class="swatches">
          <legend>Colour</legend>
          <input type="radio" name="teeColour" id="tc-ink" value="ink" checked><label for="tc-ink"><i style="--sw:#0c0b09"></i>Ink</label>
          <input type="radio" name="teeColour" id="tc-bone" value="bone"><label for="tc-bone"><i style="--sw:#efe8d8"></i>Bone</label>
          <input type="radio" name="teeColour" id="tc-gold" value="gold"><label for="tc-gold"><i style="--sw:#e3ad48"></i>Gold</label>
        </fieldset>
        <fieldset class="topics">
          <legend>Front print</legend>
{radios("teeFront", [("crown", "Crown mark"), ("wordmark", "THRONE"), ("bgs", "Big God SZN"), ("none", "Blank")], "crown")}
        </fieldset>
        <fieldset class="topics">
          <legend>Back print</legend>
{radios("teeBack", [("cities", "Lagos · Moscow · UK"), ("bgs", "Big God SZN"), ("wordmark", "THRONE"), ("none", "Blank")], "cities")}
        </fieldset>
        <div class="studio__actions">
          <button class="btn btn--ghost" type="button" data-tee-flip data-magnetic>Turn it around</button>
          <button class="btn btn--gold" type="submit" data-magnetic>Vote for this tee</button>
        </div>
        <p class="studio__summary" data-tee-summary aria-live="polite"></p>
        <p class="form-msg" id="teeMsg" role="status"></p>
      </form>
    </div>
  </section>

  <section class="mood" data-tone="light">
    <div class="section-head">
      <h2 class="section-title" data-split>How the roster dresses</h2>
      <p class="section-note"><span class="hint-desktop">Hover a photo to look closer. Drag the strip to browse.</span><span class="hint-touch">Swipe the strip. Tap a photo to open it.</span></p>
    </div>
    <div class="mood__strip" data-strip>
{looks}
    </div>
  </section>

  <section class="notify" id="first-access" data-tone="dark">
    <h2 class="notify__title" data-split>First access</h2>
    <p class="notify__text">Leave your email and you will hear about Capsule 01 before anyone else.</p>
    <form class="inline-form" id="dropForm" novalidate>
      <label class="sr-only" for="dropEmail">Email for the drop</label>
      <input id="dropEmail" type="email" placeholder="Email for first access" autocomplete="email" required>
      <button class="btn btn--gold" type="submit" data-magnetic>Notify me</button>
      <p class="form-msg" id="dropMsg" role="status"></p>
    </form>
  </section>
</main>"""


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------

# desk key, label, short description, where it goes
DESKS = [
    ("booking", "Booking", "Shows, features, appearances", "thronerecordsmanagement@gmail.com"),
    ("demo", "Demo", "Send us your music", "info@throneszn.com"),
    ("press", "Press", "Interviews and features", "info@throneszn.com"),
    ("wear", "Throne Wear", "Orders and collaborations", "info@throneszn.com"),
    ("other", "Something else", "Anything we missed", "info@throneszn.com"),
]

LINES = [
    ("Email", "info@throneszn.com"),
    ("Management", "thronerecordsmanagement@gmail.com"),
    ("Phone · UK", "077 7662 2184"),
    ("Phone · NG", "+234 803 311 2018"),
]


def build_contact_main():
    lines = "\n".join(
        f'        <li><span>{E(k)}</span><button class="copy" type="button" data-copy="{E(v)}">{E(v)}</button></li>'
        for k, v in LINES)
    tabs = "\n".join(
        f'        <button class="desk-tab" type="button" role="tab" id="tab-{k}" aria-controls="deskForm" aria-selected="{"true" if i == 0 else "false"}" data-desk="{k}" data-to="{E(to)}">'
        f'<span class="desk-tab__k">{i + 1:02d}</span><span class="desk-tab__l">{E(l)}</span><small>{E(d)}</small></button>'
        for i, (k, l, d, to) in enumerate(DESKS))
    artists = "\n".join(
        f'            <input type="checkbox" name="dkArtist" id="dk-{a["slug"]}" value="{E(" ".join(a["name"]))}"><label for="dk-{a["slug"]}">{E(" ".join(a["name"]))}</label>'
        for a in ARTISTS)
    follow = []
    for a in ARTISTS:
        if not a["links"]:
            continue
        links = " ".join(f'<a href="{E(h)}" target="_blank" rel="noopener" data-magnetic>{E(l)}</a>' for l, h in a["links"])
        follow.append(f'      <li class="follow-row" data-img="assets/img/{a["portrait"]}"><a class="follow-row__name" href="artists/{a["slug"]}.html" data-cursor="View">{E(" ".join(a["name"]))}</a><span class="follow-row__links">{links}</span></li>')
    return f"""<main id="top" data-page="contact">

  <section class="pg-hero pg-hero--contact" data-tone="dark">
    <div class="pg-hero__text">
      <p class="eyebrow">Contact</p>
      <h1 class="pg-title" aria-label="Pull up a chair."><span class="ap-line"><span>Pull up</span></span><span class="ap-line"><span>a chair.</span></span></h1>
      <p class="pg-lede">Bookings, features, press, a demo you believe in, or a question about Throne Wear. Pick a desk and tell us what you have got.</p>
      <div class="ap-actions"><a class="btn btn--gold" href="#write" data-magnetic>Write to a desk</a></div>
    </div>
    <div class="direct">
      <p class="eyebrow">Direct lines · tap to copy</p>
      <ul class="contact__lines">
{lines}
        <li><span>Post</span><span>24 Hartill Street, WV13 2JG, United Kingdom</span></li>
      </ul>
    </div>
  </section>

  <section class="desk" id="write" data-tone="light">
    <div class="section-head">
      <h2 class="section-title" data-split>Pick a desk</h2>
      <p class="section-note">The form changes with the desk, and your letter writes itself as you type.</p>
    </div>
    <div class="desk-tabs" role="tablist" aria-label="Who is this for?">
{tabs}
    </div>
    <div class="desk__grid">
      <form class="desk__form" id="deskForm" role="tabpanel" aria-labelledby="tab-booking" novalidate>
        <div class="field"><input id="dkName" type="text" placeholder=" " autocomplete="name" required><label for="dkName">Your name</label></div>
        <div class="field"><input id="dkEmail" type="email" placeholder=" " autocomplete="email" required><label for="dkEmail">Email</label></div>

        <div class="desk__group" data-for="booking">
          <fieldset class="topics">
            <legend>Who would you like to book?</legend>
{artists}
          </fieldset>
          <div class="desk__row">
            <div class="field"><input id="dkCity" type="text" placeholder=" " autocomplete="address-level2"><label for="dkCity">City</label></div>
            <div class="field field--date"><input id="dkDate" type="date"><label for="dkDate">Date</label></div>
          </div>
        </div>
        <div class="desk__group" data-for="demo" hidden>
          <div class="field"><input id="dkStage" type="text" placeholder=" "><label for="dkStage">Artist or stage name</label></div>
          <div class="field"><input id="dkLink" type="url" placeholder=" " inputmode="url"><label for="dkLink">Link to your music (SoundCloud, YouTube, Drive…)</label></div>
        </div>
        <div class="desk__group" data-for="press" hidden>
          <div class="desk__row">
            <div class="field"><input id="dkOutlet" type="text" placeholder=" "><label for="dkOutlet">Outlet</label></div>
            <div class="field field--date"><input id="dkDeadline" type="date"><label for="dkDeadline">Deadline</label></div>
          </div>
        </div>
        <div class="desk__group" data-for="wear" hidden>
          <fieldset class="topics">
            <legend>About</legend>
            <input type="radio" name="dkWear" id="dkw-capsule" value="Capsule 01" checked><label for="dkw-capsule">Capsule 01</label>
            <input type="radio" name="dkWear" id="dkw-collab" value="A collaboration"><label for="dkw-collab">A collaboration</label>
            <input type="radio" name="dkWear" id="dkw-other" value="Something else"><label for="dkw-other">Something else</label>
          </fieldset>
        </div>
        <div class="desk__group" data-for="other" hidden>
          <div class="field"><input id="dkSubject" type="text" placeholder=" "><label for="dkSubject">Subject</label></div>
        </div>

        <div class="field"><textarea id="dkMsg" rows="5" placeholder=" " required></textarea><label for="dkMsg">Your message</label></div>
        <p class="desk__to">Goes to <b data-desk-to>thronerecordsmanagement@gmail.com</b></p>
        <button class="btn btn--gold btn--wide" type="submit" data-magnetic>Seal and send <svg><use href="#i-arrow"/></svg></button>
        <p class="form-msg" id="deskMsg" role="status"></p>
      </form>

      <div class="letter-stage" aria-hidden="true">
        <div class="letter" data-letter>
          <div class="letter__paper">
            <div class="letter__head">
              <p class="letter__to">To: Throne Records · <span data-l-desk>Booking</span> desk</p>
              <div class="letter__stamp"><svg viewBox="0 0 38 22"><use href="#crownMark"/></svg><span>WV13 · UK</span></div>
            </div>
            <p class="letter__date" data-l-date></p>
            <p class="letter__re">Re: <span data-l-re>A booking enquiry</span></p>
            <p class="letter__body"><span data-l-body>Dear Throne Records,</span><i class="letter__caret"></i></p>
            <p class="letter__from">— <span data-l-name>Your name</span><br><small data-l-email>you@example.com</small></p>
          </div>
          <div class="letter__envelope"><div class="letter__flap"></div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="cities cities--contact" aria-label="Where we are" data-tone="dark">
    <div class="city"><span class="city__name">Lagos</span><span class="city__time" data-tz="Africa/Lagos">--:--</span><span class="city__note">Nigeria · +234 803 311 2018</span></div>
    <div class="city"><span class="city__name">Moscow</span><span class="city__time" data-tz="Europe/Moscow">--:--</span><span class="city__note">Russia · studio &amp; shows</span></div>
    <div class="city"><span class="city__name">UK</span><span class="city__time" data-tz="Europe/London">--:--</span><span class="city__note">Label office · 24 Hartill Street, WV13 2JG</span></div>
  </section>

  <section class="follow" data-tone="light">
    <div class="section-head">
      <h2 class="section-title" data-split>Follow the roster</h2>
      <p class="section-note">Where the artists post first.</p>
    </div>
    <ul class="follow-list">
{chr(10).join(follow)}
    </ul>
  </section>
</main>"""


def chrome_for_subdir(chrome):
    """Re-point relative URLs in the shared chrome one directory up."""
    for attr in ("href", "src"):
        chrome = re.sub(rf'{attr}="(css/|js/|assets/)', rf'{attr}="../\1', chrome)
        chrome = chrome.replace(f'{attr}="./', f'{attr}="../')
    # plain page links (shows.html, wear.html …) also move up a level
    chrome = re.sub(r'href="(?!#|[a-z]+:|\.\./|/)([\w-]+\.html)', r'href="../\1', chrome)
    return chrome.replace('<meta name="site-root" content="./">', '<meta name="site-root" content="../">')


def write_page(path, head, tail, page, title, desc, main_html):
    h = head.replace('data-page="home"', f'data-page="{page}"')
    h = re.sub(r"<title>.*?</title>", f"<title>{E(title)}</title>", h)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{E(desc)}">', h)
    path.write_text(h + main_html + tail)
    print("wrote", path.relative_to(ROOT))


def main():
    src = (ROOT / "index.html").read_text()
    m = re.search(r"<main[^>]*>.*?</main>", src, re.S)
    head, tail = src[: m.start()], src[m.end():]
    sub_head, sub_tail = chrome_for_subdir(head), chrome_for_subdir(tail)

    OUT.mkdir(exist_ok=True)
    for i, a in enumerate(ARTISTS):
        nxt = ARTISTS[(i + 1) % len(ARTISTS)]
        name = " ".join(a["name"])
        write_page(OUT / f'{a["slug"]}.html', sub_head, sub_tail, "artist",
                   f"{name} — Throne Records", a["lede"], build_main(a, nxt))

    write_page(ROOT / "shows.html", head, tail, "shows", "Shows — Throne Records",
               "Where Throne Records has played, where it is going next, and how to bring the roster to your city.",
               build_shows_main())
    write_page(ROOT / "contact.html", head, tail, "contact", "Contact — Throne Records",
               "Bookings, demos, press and Throne Wear: pick a desk and write to Throne Records.",
               build_contact_main())
    write_page(ROOT / "wear.html", head, tail, "wear", "Throne Wear — Throne Records",
               "Throne Wear Capsule 01 is in the works. Design the first drop and get first access.",
               build_wear_main())


if __name__ == "__main__":
    main()
