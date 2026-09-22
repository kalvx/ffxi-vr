(function(){
  const overlay=document.querySelector('#mob-grid-overlay');
  const root=document.querySelector('#world-route-root');
  const results=document.querySelector('#mob-grid-results');
  const title=document.querySelector('#mob-grid-title');
  const summary=document.querySelector('#mob-grid-summary');
  const search=document.querySelector('#mob-grid-search');
  const closeButton=document.querySelector('#mob-grid-close');
  if(!overlay||!root||!results)return;

  const field=window.CR_ZONE_FIELD_GUIDES||{};
  const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fieldFor=zone=>field[zone]||field[Object.keys(field).find(k=>norm(k)===norm(zone))]||null;
  let activeZone='',activeFilter='all',returnFocus=null;

  function records(){
    const g=fieldFor(activeZone)||{};
    return [
      ...(g.mobs||[]).filter(m=>!m.nm&&!m.hnm).map(m=>({...m,kind:'regular'})),
      ...(g.nms||[]).map(m=>({...m,kind:'nm',nm:true})),
      ...(g.mobs||[]).filter(m=>m.nm&&!m.hnm).map(m=>({...m,kind:'nm'})),
      ...(g.hnms||[]).map(m=>({...m,kind:'hnm',hnm:true})),
      ...(g.mobs||[]).filter(m=>m.hnm).map(m=>({...m,kind:'hnm'})),
    ].filter((mob,index,all)=>all.findIndex(other=>norm(other.name)===norm(mob.name)&&other.kind===mob.kind)===index);
  }
  function dropList(mob){const value=mob.drops||mob.drop||[];return Array.isArray(value)?value:(value?String(value).split('|'):[])}
  function card(mob){
    const drops=dropList(mob),rank=mob.kind==='hnm'?'HNM':mob.kind==='nm'?'NM':'MOB';
    const location=mob.grid||mob.mapGrid||mob.pos||'Location not yet mapped';
    return `<article class="mob-overlay-card ${mob.kind}"><div class="mob-overlay-portrait" aria-hidden="true">✦</div><span class="mob-overlay-rank">${rank}</span><div class="mob-overlay-card-body"><h3>${esc(mob.name||'Unknown monster')}</h3><div class="mob-overlay-meta">${mob.level?`<span>Lv. ${esc(mob.level)}</span>`:''}<span>${esc(location)}</span>${mob.spawn?`<span>${esc(mob.spawn)}</span>`:''}</div>${mob.detect?`<p><b>Behavior:</b> ${esc(mob.detect)}</p>`:''}${mob.note?`<small>${esc(mob.note)}</small>`:''}<p class="mob-overlay-drops"><b>${mob.kind==='regular'?'Drops:':'★ Notable drops:'}</b> ${drops.length?drops.map(esc).join(' • '):'No recorded drops'}</p></div></article>`;
  }
  function render(){
    const q=norm(search?.value),all=records();
    const visible=all.filter(mob=>{
      const typeMatch=activeFilter==='all'||mob.kind===activeFilter||(activeFilter==='aggressive'&&/aggressive|sight|sound|true detection|links/i.test(String(mob.detect||'')));
      const haystack=norm([mob.name,mob.level,mob.grid,mob.mapGrid,mob.pos,mob.spawn,mob.detect,mob.note,...dropList(mob)].join(' '));
      return typeMatch&&(!q||haystack.includes(q));
    });
    summary.textContent=`${visible.length} of ${all.length} loaded monster records shown. List view remains unchanged behind this overlay.`;
    results.innerHTML=visible.map(card).join('')||'<p class="mob-overlay-empty">No monsters match this search and filter.</p>';
  }
  function open(zone,button){
    activeZone=zone;returnFocus=button;activeFilter=localStorage.getItem('crMobGridFilter')||'all';
    overlay.querySelectorAll('[data-mob-filter]').forEach(b=>b.classList.toggle('active',b.dataset.mobFilter===activeFilter));
    if(search)search.value='';title.textContent=`${zone} monsters`;overlay.hidden=false;document.body.classList.add('mob-overlay-open');render();search?.focus();
  }
  function close(){overlay.hidden=true;document.body.classList.remove('mob-overlay-open');activeZone='';returnFocus?.focus();returnFocus=null}
  root.addEventListener('click',event=>{const button=event.target.closest('[data-open-mob-grid]');if(button)open(button.dataset.openMobGrid,button)});
  closeButton?.addEventListener('click',close);overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
  search?.addEventListener('input',render);
  overlay.querySelector('.mob-overlay-filters')?.addEventListener('click',event=>{const button=event.target.closest('[data-mob-filter]');if(!button)return;activeFilter=button.dataset.mobFilter;localStorage.setItem('crMobGridFilter',activeFilter);overlay.querySelectorAll('[data-mob-filter]').forEach(b=>b.classList.toggle('active',b===button));render()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden)close()});
})();
