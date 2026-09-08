#!/usr/bin/env python3
"""Apply one shared navigation shell and file://-safe links to public pages."""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import re

ROOT = Path(__file__).resolve().parents[1]
SKIP = {ROOT / 'admin' / 'index.html', ROOT / 'tools' / 'library-source.html'}

def prefix_for(path):
    depth = len(path.relative_to(ROOT).parent.parts)
    return '../' * depth

def shell(prefix, active):
    def link(slug, label):
        current = ' aria-current="page"' if active == slug else ''
        return f'<a{current} href="{prefix}{slug}/index.html">{label}</a>'
    header = f'''<header class="topbar"><a class="brand" href="{prefix}index.html"><span class="crystal">✦</span><span><small>FFXI VR</small><strong>Current Reality</strong></span></a><nav aria-label="Main navigation">{link('guides','Guides')}{link('missions','Missions')}{link('quests','Quests')}{link('trusts','Trusts')}{link('reference','Database')}<a class="admin-link" href="{prefix}admin/index.html">GM Login</a></nav></header>'''
    groups = [
        ('Adventure',[('guides','Guide index'),('missions','Missions'),('quests','Quests'),('travel','Travel'),('trusts','Trusts')]),
        ('Character',[('jobs','Jobs'),('macros','Macros'),('skillchains','Skillchains')]),
        ('Items & systems',[('gear','Gear'),('crafting','Crafting'),('fishing','Fishing'),('calendar','Calendar'),('reference','Database'),('addons','Addons')])]
    nav = ''.join(f'<h3>{heading}</h3>'+''.join(link(slug,label) for slug,label in links) for heading,links in groups)
    sidebar = f'<aside class="wiki-sidebar"><h2>Compendium</h2><nav aria-label="Compendium directory">{nav}</nav></aside>'
    return header, sidebar

def safe_href(match):
    value = match.group(1)
    if value.startswith(('#','mailto:','tel:','javascript:')):
        return match.group(0)
    parts = urlsplit(value)
    if parts.scheme or parts.netloc:
        return match.group(0)
    path = parts.path
    if path.endswith('/'):
        path += 'index.html'
    return f'href="{urlunsplit((parts.scheme,parts.netloc,path,parts.query,parts.fragment))}"'

for path in ROOT.rglob('*.html'):
    if path in SKIP:
        continue
    text = path.read_text(encoding='utf-8')
    rel = path.relative_to(ROOT)
    active = rel.parts[0] if len(rel.parts) > 1 else 'home'
    prefix = prefix_for(path)
    header, sidebar = shell(prefix, active)
    if '<header class="topbar"' in text:
        text = re.sub(r'<header class="topbar".*?</header>', header, text, count=1, flags=re.S)
    if '<aside class="wiki-sidebar"' in text:
        text = re.sub(r'<aside class="wiki-sidebar".*?</aside>', sidebar, text, count=1, flags=re.S)
    if 'assets/wiki.js' not in text and '</head>' in text:
        text = text.replace('</head>', f'<script src="{prefix}assets/wiki.js" defer></script></head>', 1)
    text = re.sub(r'href="([^"]+)"', safe_href, text)
    path.write_text(text, encoding='utf-8')

# The admin bridge stays visually separate, but its return link must also work via file://.
admin = ROOT / 'admin' / 'index.html'
text = admin.read_text(encoding='utf-8').replace('href="../"', 'href="../index.html"')
admin.write_text(text, encoding='utf-8')
