// Automatically enrich every World Route Finder card in the selected expansion.
// Loads one zone at a time so the browser is not flooded and leaves the map system untouched.
(function(){
  const root=document.querySelector('#world-route-root');
  if(!root)return;
  const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
  const field=window.CR_ZONE_FIELD_GUIDES||{};
  const fieldFor=zone=>field[zone]||field[Object.keys(field).find(k=>norm(k)===norm(zone))]||null;
  const zoneName=card=>card.querySelector('h3')?.textContent?.trim()||'';
  let busy=false;
  const pending=[];
  const queued=new Set();

  function avoidance(detect){
    const s=String(detect||'').toLowerCase(),tips=[];
    if(s.includes('true detection'))tips.push('True detection: standard Sneak/Invisible will not make this safe; give it a wide berth.');
    else{
      if(s.includes('sight'))tips.push('Sight aggro: Invisible / Prism Powder is the relevant protection.');
      if(s.includes('sound'))tips.push('Sound aggro: Sneak / Silent Oil is the relevant protection.');
      if(s.includes('aggressive')&&!s.includes('sight')&&!s.includes('sound'))tips.push('Aggressive: keep Sneak/Invisible ready and avoid its aggro radius.');
    }
    if(s.includes('links'))tips.push('Links: avoid fighting beside others of the same family.');
    return tips.join(' ');
  }

  function addHazards(card){
    const zone=zoneName(card),g=fieldFor(zone);if(!g?.dbLoaded)return;
    if(card.querySelector('.route-hazard-auto'))return;
    const all=[...(g.mobs||[]),...(g.nms||[]),...(g.hnms||[])];
    const dangerous=all.filter(m=>/aggressive|true detection|links|sight|sound/i.test(String(m.detect||''))).slice(0,18);
    if(!dangerous.length)return;
    const details=document.createElement('details');details.className='route-detail route-hazard-auto';
    details.innerHTML=`<summary><strong>Route hazards & how to avoid them</strong> <span>${dangerous.length}</span></summary><div class="route-hazard-list">${dangerous.map(m=>`<div class="route-hazard-row"><strong>${m.hnm?'HNM • ':m.nm?'NM • ':''}${m.name||'Monster'}</strong><span>${m.level?`Lv. ${m.level} • `:''}${m.pos||'spawn coordinates in zone database'}</span><small>${m.detect||''}${avoidance(m.detect)?` — ${avoidance(m.detect)}`:''}</small></div>`).join('')}</div>`;
    const exits=card.querySelector('.exits-panel');if(exits)exits.insertAdjacentElement('afterend',details);else card.querySelector('h3')?.insertAdjacentElement('afterend',details);
  }

  const gearWords=/\b(ring|earring|earrings|necklace|torque|gorget|pendant|mantle|cape|belt|sash|helm|helmet|mask|hat|cap|crown|circlet|mail|armor|armour|harness|robe|coat|tunic|jerkin|gloves|mitts|gauntlets|cuffs|trousers|hose|brais|subligar|boots|greaves|leggings|sword|dagger|knife|axe|scythe|spear|lance|katana|bow|staff|club|shield)\b/i;
  function emphasizeDrops(card){
    card.querySelectorAll('.field-grid>div').forEach(entry=>{
      if(entry.dataset.dropEmphasis==='1')return;
      const dropLine=[...entry.querySelectorAll('small')].find(s=>/^\s*Drops:/i.test(s.textContent||''));if(!dropLine)return;
      const items=(dropLine.textContent||'').replace(/^\s*Drops:\s*/i,'').split(/\s*[•|]\s*/).filter(Boolean);if(!items.length)return;
      const notable=entry.classList.contains('nm-entry')||entry.classList.contains('hnm-entry');dropLine.textContent='';
      const label=document.createElement('b');label.textContent=notable?'★ Notable drops: ':'Drops: ';dropLine.appendChild(label);
      items.forEach((item,i)=>{if(i)dropLine.appendChild(document.createTextNode(' • '));const important=notable||gearWords.test(item);const node=document.createElement(important?'strong':'span');node.textContent=item;if(important){node.style.fontWeight='800';node.style.fontStyle=notable?'italic':'normal'}dropLine.appendChild(node)});
      if(notable)entry.style.boxShadow='inset 3px 0 0 rgba(255,255,255,.28)';entry.dataset.dropEmphasis='1';
    });
  }

  function addSpawnBadges(card){
    card.querySelectorAll('.nm-entry,.hnm-entry').forEach(entry=>{
      if(entry.dataset.spawnBadge==='1')return;const text=(entry.textContent||'').toLowerCase();let label='';
      if(/forced spawn|force spawn|trade .* to|trade .*item|pop item|spawn item/.test(text))label='★ FORCED SPAWN';else if(/lottery/.test(text))label='★ LOTTERY';else if(/timed spawn|timed repop|respawn/.test(text))label='★ TIMED SPAWN';
      if(label){const badge=document.createElement('small');badge.textContent=label;badge.style.fontWeight='900';badge.style.letterSpacing='.05em';entry.appendChild(badge)}entry.dataset.spawnBadge='1';
    });
  }

  function finishCard(card){
    const zone=zoneName(card),g=fieldFor(zone);if(!g?.dbLoaded)return;
    // Only establish the compact default once. Never re-collapse a section the player opened.
    if(card.dataset.compactInitialized!=='1'){card.querySelectorAll('.field-panel').forEach(p=>p.open=false);card.dataset.compactInitialized='1'}
    const status=card.querySelector('.zone-db-status');if(status)status.textContent='Mobs, NPCs, NMs, HNMs, coordinates and drops loaded for this zone.';
    addHazards(card);emphasizeDrops(card);addSpawnBadges(card);
  }

  function queueCard(card){
    if(!card)return;const zone=zoneName(card);if(!zone||fieldFor(zone)?.dbLoaded){finishCard(card);return}
    if(queued.has(zone))return;const button=card.querySelector('[data-load-zone-db]');if(!button)return;
    queued.add(zone);pending.push(zone);pump();
  }

  function pump(){
    if(busy||!pending.length)return;
    const zone=pending.shift(),card=[...root.querySelectorAll('.route-card')].find(c=>zoneName(c)===zone);
    if(!card){queued.delete(zone);pump();return}
    if(fieldFor(zone)?.dbLoaded){queued.delete(zone);finishCard(card);pump();return}
    const button=card.querySelector('[data-load-zone-db]');if(!button||button.disabled){queued.delete(zone);pump();return}
    busy=true;const status=card.querySelector('.zone-db-status');if(status)status.textContent='Loading mobs, NPCs, NMs, HNMs, coordinates and drops…';button.click();
    const started=Date.now();
    const wait=()=>{
      if(fieldFor(zone)?.dbLoaded){busy=false;queued.delete(zone);scan();pump();return}
      if(Date.now()-started>30000){busy=false;queued.delete(zone);if(status)status.textContent='No field-guide data returned for this zone; continuing with the rest of the expansion.';pump();return}
      setTimeout(wait,250);
    };setTimeout(wait,250);
  }

  function scan(){
    // The expansion selector already limits the page, so fill every displayed zone rather than
    // only zones that happen to intersect the viewport. Cities with no mob data simply keep NPCs/exits.
    root.querySelectorAll('.route-card').forEach(card=>{finishCard(card);queueCard(card)});
  }
  let scanTimer=0;new MutationObserver(()=>{clearTimeout(scanTimer);scanTimer=setTimeout(scan,80)}).observe(root,{childList:true,subtree:true});
  setTimeout(scan,250);
})();
