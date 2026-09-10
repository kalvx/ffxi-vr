// Automatically enrich visible World Route Finder cards with the real zone database.
// Keeps the existing card layout/order; it only fills the missing field-guide data.
(function(){
  const root=document.querySelector('#world-route-root');
  if(!root)return;
  const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
  const field=window.CR_ZONE_FIELD_GUIDES||{};
  const fieldFor=zone=>field[zone]||field[Object.keys(field).find(k=>norm(k)===norm(zone))]||null;
  const zoneName=card=>card.querySelector('h3')?.textContent?.trim()||'';

  function avoidance(detect){
    const s=String(detect||'').toLowerCase();
    const tips=[];
    if(s.includes('true detection'))tips.push('True detection: standard Sneak/Invisible will not make this safe; give it a wide berth.');
    else {
      if(s.includes('sight'))tips.push('Sight aggro: Invisible / Prism Powder is the relevant protection.');
      if(s.includes('sound'))tips.push('Sound aggro: Sneak / Silent Oil is the relevant protection.');
      if(s.includes('aggressive')&&!s.includes('sight')&&!s.includes('sound'))tips.push('Aggressive: keep Sneak/Invisible ready and avoid its aggro radius.');
    }
    if(s.includes('links'))tips.push('Links: avoid fighting beside others of the same family.');
    return tips.join(' ');
  }

  function addHazards(card){
    const zone=zoneName(card),g=fieldFor(zone);if(!g?.dbLoaded)return;
    card.querySelector('.route-hazard-auto')?.remove();
    const all=[...(g.mobs||[]),...(g.nms||[]),...(g.hnms||[])];
    const dangerous=all.filter(m=>/aggressive|true detection|links|sight|sound/i.test(String(m.detect||''))).slice(0,18);
    if(!dangerous.length)return;
    const details=document.createElement('details');
    details.className='route-detail route-hazard-auto';details.open=true;
    details.innerHTML=`<summary><strong>Route hazards & how to avoid them</strong> <span>${dangerous.length}</span></summary><div class="route-hazard-list">${dangerous.map(m=>`<div class="route-hazard-row"><strong>${m.hnm?'HNM • ':m.nm?'NM • ':''}${m.name||'Monster'}</strong><span>${m.level?`Lv. ${m.level} • `:''}${m.pos||'spawn coordinates in zone database'}</span><small>${m.detect||''}${avoidance(m.detect)?` — ${avoidance(m.detect)}`:''}</small></div>`).join('')}</div>`;
    const exits=card.querySelector('.exits-panel');
    if(exits)exits.insertAdjacentElement('afterend',details);else card.querySelector('h3')?.insertAdjacentElement('afterend',details);
  }

  function finishCard(card){
    card.querySelectorAll('.field-panel').forEach(p=>p.open=true);
    const status=card.querySelector('.zone-db-status');
    if(status&&/loaded/i.test(status.textContent||''))status.textContent='Mobs, NPCs, NMs, HNMs, coordinates and drops loaded for this zone.';
    addHazards(card);
  }

  function startCard(card){
    if(!card||card.dataset.atlasAuto==='1'){finishCard(card);return;}
    const button=card.querySelector('[data-load-zone-db]');
    if(!button){finishCard(card);return;}
    if(button.disabled){card.dataset.atlasAuto='1';finishCard(card);return;}
    card.dataset.atlasAuto='1';
    const status=card.querySelector('.zone-db-status');
    if(status)status.textContent='Loading mobs, NPCs, NMs, HNMs, coordinates and drops…';
    button.click();
  }

  const io='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){startCard(e.target);io.unobserve(e.target)}}),{rootMargin:'900px 0px'}):null;
  function scan(){
    root.querySelectorAll('.route-card').forEach(card=>{
      finishCard(card);
      if(io&&!card.dataset.atlasObserved){card.dataset.atlasObserved='1';io.observe(card)}
      else if(!io)startCard(card);
    });
  }
  new MutationObserver(scan).observe(root,{childList:true,subtree:true});
  scan();
})();
