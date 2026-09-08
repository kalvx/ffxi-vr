#!/usr/bin/env python3
"""Build the standalone Compendium section pages from the preserved V4 source."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "tools" / "library-source.html").read_text(encoding="utf-8")

def section(section_id):
    match = re.search(rf'<section\b[^>]*\bid="{re.escape(section_id)}"[^>]*>.*?</section>', SOURCE, re.S)
    if not match:
        raise SystemExit(f"Missing section: {section_id}")
    return match.group(0)

PAGES = {
    "jobs": ("Jobs", ["jobs", "abilities", "weapons"], True),
    "macros": ("Macros", ["macros"], True),
    "reference": ("Server Database", ["reference"], True),
    "gear": ("Gear Planner", ["gear"], True),
    "crafting": ("Crafting", ["crafts"], True),
    "skillchains": ("Skillchains", ["skillchains"], True),
    "fishing": ("Fishing", ["fishing"], False),
    "calendar": ("Vana’diel Calendar", ["calendar"], False),
    "addons": ("Client Addons", ["addons"], False),
}

SIDEBAR = '''<aside class="wiki-sidebar"><h2>Compendium</h2><nav><h3>Adventure</h3><a href="../guides/">Guides</a><a href="../missions/">Missions</a><a href="../quests/">Quests</a><a href="../travel/">Travel</a><a href="../trusts/">Trusts</a><h3>Character</h3><a href="../jobs/">Jobs</a><a href="../macros/">Macros</a><a href="../skillchains/">Skillchains</a><h3>Items & systems</h3><a href="../gear/">Gear</a><a href="../crafting/">Crafting</a><a href="../fishing/">Fishing</a><a href="../calendar/">Calendar</a><a href="../reference/">Database</a><a href="../addons/">Addons</a></nav></aside>'''

DYNAMIC = ["macros", "jobs", "reference", "gear", "crafts", "skillchains"]

def page(slug, title, ids, interactive):
    visible = "\n".join(section(x) for x in ids)
    hidden = ""
    scripts = '<script src="../assets/wiki.js" defer></script>'
    if interactive:
        hidden_ids = [x for x in DYNAMIC if x not in ids]
        clock = '<div id="vana-time"></div><div id="vana-date"></div><div id="vana-element-icon"></div><div id="vana-element"></div><div id="vana-next-day"></div><div id="vana-moon"></div>'
        hidden = '<div hidden aria-hidden="true">' + clock + "\n".join(section(x) for x in hidden_ids) + '</div>'
        scripts += '<script src="../assets/site.js" defer></script><script src="../assets/v3.js" defer></script><script src="../assets/v4.js" defer></script><script src="../assets/v4-data.js" defer></script>'
    active_sidebar = SIDEBAR.replace(f'href="../{slug}/"', f'aria-current="page" href="../{slug}/"')
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{title} for FFXI VR: Current Reality."><title>{title} | FFXI VR: Current Reality</title><link rel="stylesheet" href="../assets/site.css"><link rel="stylesheet" href="../assets/components.css"><link rel="stylesheet" href="../assets/v3.css"><link rel="stylesheet" href="../assets/v3-fishing.css"><link rel="stylesheet" href="../assets/v4.css"><link rel="stylesheet" href="../assets/v4-clock.css"><link rel="stylesheet" href="../assets/v4-data.css"><link rel="stylesheet" href="../assets/v4-calendar.css"><link rel="stylesheet" href="../assets/v4-jobs.css"><link rel="stylesheet" href="../assets/wiki.css">{scripts}</head><body><header class="topbar"><a class="brand" href="../"><span class="crystal">✦</span><span><small>FFXI VR</small><strong>Current Reality</strong></span></a><nav><a href="../">Home</a><a href="../guides/">Guides</a><a href="../trusts/">Trusts</a><a href="../reference/">Database</a><a class="admin-link" href="../admin/">GM Login</a></nav></header><div class="wiki-layout">{active_sidebar}<main class="wiki-main"><header class="wiki-title"><p class="eyebrow">Standalone compendium page</p><h1>{title}</h1><p>This information now lives on its own page—use the left navigation to move between subjects without crossing the full Compendium.</p></header>{visible}</main></div>{hidden}<footer><div>✦ FFXI VR: Current Reality</div><p>Player Compendium · {title}</p><a href="../admin/">Administration</a></footer></body></html>'''

for slug, (title, ids, interactive) in PAGES.items():
    target = ROOT / slug
    target.mkdir(exist_ok=True)
    (target / "index.html").write_text(page(slug, title, ids, interactive), encoding="utf-8")
