#!/usr/bin/env python3
"""Generate the artist pages in artists/ from index.html.

The header, menu, player and footer are copied from index.html so every page
shares identical chrome; only <main> is artist-specific. Edit ARTISTS below
(or index.html's chrome), then run:

    python3 scripts/build_artists.py
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
        <a class="btn btn--ghost" href="../#contact" data-magnetic>Book {E(a["name"][0])}</a>
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


def chrome_for_subdir(chrome):
    """Re-point relative URLs in the shared chrome one directory up."""
    for attr in ("href", "src"):
        chrome = re.sub(rf'{attr}="(css/|js/|assets/)', rf'{attr}="../\1', chrome)
        chrome = chrome.replace(f'{attr}="./', f'{attr}="../')
    return chrome.replace('<meta name="site-root" content="./">', '<meta name="site-root" content="../">')


def main():
    src = (ROOT / "index.html").read_text()
    m = re.search(r"<main[^>]*>.*?</main>", src, re.S)
    head, tail = src[: m.start()], src[m.end():]
    head, tail = chrome_for_subdir(head), chrome_for_subdir(tail)
    head = head.replace('data-page="home"', 'data-page="artist"')
    OUT.mkdir(exist_ok=True)
    for i, a in enumerate(ARTISTS):
        nxt = ARTISTS[(i + 1) % len(ARTISTS)]
        name = " ".join(a["name"])
        h = re.sub(r"<title>.*?</title>", f"<title>{E(name)} — Throne Records</title>", head)
        h = re.sub(r'<meta name="description" content="[^"]*">',
                   f'<meta name="description" content="{E(a["lede"])}">', h)
        (OUT / f'{a["slug"]}.html').write_text(h + build_main(a, nxt) + tail)
        print("wrote", OUT / f'{a["slug"]}.html')


if __name__ == "__main__":
    main()
