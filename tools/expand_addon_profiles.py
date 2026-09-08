#!/usr/bin/env python3
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
cards='''
        <article class="addon-card" data-addon="toon shading graphics plugin">
          <div class="addon-card-head"><i>◈</i><h3>Toon</h3></div><p>Toggle the bundled Toon shader plugin for the current session.</p><div class="command-list"><div class="command-row"><code>/load toon</code><span>Enable Toon shading.</span></div><div class="command-row"><code>/unload toon</code><span>Disable Toon shading.</span></div></div>
        </article>
        <article class="addon-card" data-addon="minimap classic map plugin">
          <div class="addon-card-head"><i>▦</i><h3>Minimap</h3></div><p>Control the classic Minimap plugin when Boussole is not preferred.</p><div class="command-list"><div class="command-row"><code>/load minimap</code><span>Enable the classic Minimap.</span></div><div class="command-row"><code>/unload minimap</code><span>Remove it for this session.</span></div></div>
        </article>
        <article class="addon-card" data-addon="distance target range addon">
          <div class="addon-card-head"><i>↔</i><h3>Distance</h3></div><p>Show range information for the selected target.</p><div class="command-list"><div class="command-row"><code>/addon load distance</code><span>Enable target-distance information.</span></div><div class="command-row"><code>/addon unload distance</code><span>Disable it for this session.</span></div><div class="command-row"><code>/addon reload distance</code><span>Reload its saved configuration.</span></div></div>
        </article>
        <article class="addon-card" data-addon="move interface window addon">
          <div class="addon-card-head"><i>✥</i><h3>Move</h3></div><p>Reposition supported interface elements and addon windows.</p><div class="command-list"><div class="command-row"><code>/addon load move</code><span>Enable Move.</span></div><div class="command-row"><code>/addon unload move</code><span>Disable Move for this session.</span></div><div class="command-row"><code>/addon reload move</code><span>Reload after configuration changes.</span></div></div>
        </article>
        <article class="addon-card" data-addon="timestamp chat time addon">
          <div class="addon-card-head"><i>◷</i><h3>Timestamp</h3></div><p>Add time markers to chat-log messages.</p><div class="command-list"><div class="command-row"><code>/addon load timestamp</code><span>Enable chat timestamps.</span></div><div class="command-row"><code>/addon unload timestamp</code><span>Hide timestamps for this session.</span></div><div class="command-row"><code>/addon reload timestamp</code><span>Reload its saved settings.</span></div></div>
        </article>
        <article class="addon-card" data-addon="tparty party alliance tp mp addon">
          <div class="addon-card-head"><i>♟</i><h3>TParty</h3></div><p>Display enhanced party and alliance status information.</p><div class="command-list"><div class="command-row"><code>/addon load tparty</code><span>Enable the enhanced party display.</span></div><div class="command-row"><code>/addon unload tparty</code><span>Return to the normal party display.</span></div><div class="command-row"><code>/addon reload tparty</code><span>Reload its saved settings.</span></div></div>
        </article>'''
pattern=r'\s*<article class="addon-card" data-addon="toon minimap distance move timestamp tparty.*?</article>'
for rel in ['addons/index.html','tools/library-source.html']:
    path=ROOT/rel;text=path.read_text(encoding='utf-8');text,count=re.subn(pattern,'\n'+cards,text,count=1,flags=re.S)
    if count!=1:raise SystemExit(f'Bundled profile not found in {rel}')
    path.write_text(text,encoding='utf-8')
