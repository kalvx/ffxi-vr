(function(){
  const data=window.CR_WORLD_ROUTES||[];
  const details=window.CR_ROUTE_DETAILS||{};
  const exits=window.CR_ZONE_EXITS||{};
  const field=window.CR_ZONE_FIELD_GUIDES||{};
  const root=document.querySelector('#world-route-root');
  const search=document.querySelector('#route-search');
  const type=document.querySelector('#route-expansion');
  if(!root)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/\[s\]/g,'(s)').replace(/#/g,'').replace(/the celestial nexus/g,'celestial nexus').replace(/riverne - site\s+[ab]01/g,m=>m.replace(/\s+/g,' ')).replace(/[^a-z0-9()' ]+/g,' ').replace(/\s+/g,' ').trim();
  const keyFor=zone=>Object.keys(exits).find(k=>norm(k)===norm(zone));
  const getExits=zone=>{const k=keyFor(zone);return k?exits[k]:null};
  const coordRe=/\[([A-N](?:\/[A-N])?)-(\d{1,2})\]/g;

  function parseExit(raw){
    const mapBits=[];
    const coords=[];
    let m;
    while((m=coordRe.exec(raw)))coords.push({x:m[1],y:Number(m[2]),raw:m[0]});
    const target=raw.split(/\s+(?=(?:Map\d+:\s*)?\[)/)[0].replace(/\s+Map\d+:$/,'').trim();
    const maps=[...raw.matchAll(/Map(\d+):/g)].map(x=>`Map ${x[1]}`);
    return {raw,target,coords,maps};
  }

  function reciprocalArrival(fromZone,target){
    const list=getExits(target)||[];
    const match=list.find(e=>norm(parseExit(e).target)===norm(fromZone));
    if(!match)return '';
    const p=parseExit(match);
    return p.coords.length?p.coords.map(c=>c.raw).join(' / '):'';
  }

  function coordPos(c){
    if(!c)return {x:50,y:50};
    const first=c.x.split('/')[0].charCodeAt(0)-65;
    return {x:Math.max(8,Math.min(92,8+(first/13)*84)),y:Math.max(8,Math.min(92,7+((c.y-1)/13)*86))};
  }

  function connectionMap(zone){
    const list=getExits(zone);
    if(list===null)return `<div class="zone-map zone-map-missing"><div class="zone-center"><strong>${esc(zone)}</strong><span>Connection data not yet matched</span></div></div>`;
    if(!list.length)return `<div class="zone-map zone-map-battle"><div class="zone-center"><strong>${esc(zone)}</strong><span>Battlefield / instance</span></div><div class="zone-noexit">No conventional walkable zone exits</div></div>`;
    const parsed=list.map(parseExit);
    const nodes=[]; const lines=[];
    parsed.forEach((p,idx)=>{
      const cs=p.coords.length?p.coords:[null];
      cs.forEach((c,j)=>{
        const pos=coordPos(c);
        const arrival=reciprocalArrival(zone,p.target);
        const id=`z${idx}_${j}`;
        nodes.push(`<div class="zone-exit" style="left:${pos.x}%;top:${pos.y}%" data-exit="${esc(id)}"><strong>${esc(p.target)}</strong><span>${c?`Exit ${esc(c.raw)}`:'Connection'}${arrival?` → Arrive ${esc(arrival)}`:''}</span>${p.maps.length?`<em>${esc(p.maps.join(' / '))}</em>`:''}</div>`);
        lines.push(`<line x1="50" y1="50" x2="${pos.x}" y2="${pos.y}" marker-end="url(#arrow)"/>`);
      });
    });
    return `<div class="zone-map"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>${lines.join('')}</svg><div class="zone-center"><strong>${esc(zone)}</strong><span>Connections</span></div>${nodes.join('')}</div>`;
  }

  const cleanStep=s=>String(s||'').replace(/\.$/,'');
  const routeDiagram=(r,i)=>{
    const steps=r.steps||[]; if(!steps.length)return '';
    const nodes=steps.map((s,n)=>`<div class="route-node"><span class="route-node-num">${n+1}</span><span>${esc(cleanStep(s))}</span></div>`);
    return `<div class="route-map" aria-label="${esc(r.name||`Route ${String.fromCharCode(65+i)}`)} diagram"><div class="route-map-label">${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</div><div class="route-flow">${nodes.join('<div class="route-arrow" aria-hidden="true">➜</div>')}</div></div>`;
  };

  function fieldGuide(zone){
    const g=field[zone]||field[keyFor(zone)]||null;
    if(!g)return '';
    const mobs=g.mobs?.length?`<details class="field-panel"><summary>Mobs & detection</summary><div class="field-grid">${g.mobs.map(m=>`<div><strong>${esc(m.name)}</strong><span>${esc(m.detect||'Non-aggressive / special')}</span>${m.note?`<small>${esc(m.note)}</small>`:''}</div>`).join('')}</div></details>`:'';
    const npcs=g.npcs?.length?`<details class="field-panel"><summary>Notable NPCs</summary><div class="field-grid">${g.npcs.map(n=>`<div><strong>${esc(n.name)}</strong><span>${esc(n.pos||'')}</span>${n.note?`<small>${esc(n.note)}</small>`:''}</div>`).join('')}</div></details>`:'';
    const dig=g.dig?.length?`<details class="field-panel"><summary>Chocobo digging / gathering</summary><p>${g.dig.map(esc).join(' • ')}</p></details>`:'';
    const items=g.items?.length?`<details class="field-panel"><summary>Notable obtainable items</summary><p>${g.items.map(esc).join(' • ')}</p></details>`:'';
    return mobs+npcs+dig+items;
  }

  const routeCard=(zone)=>{
    const d=details[zone];
    const routes=d?.routes?.length?(d.routes||[]).map((r,i)=>`<details class="route-detail"><summary>${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</summary>${routeDiagram(r,i)}<ol class="guide-steps">${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`).join(''):'';
    const unlocks=d?.unlocks?.length?`<p><strong>Unlock on the way:</strong> ${d.unlocks.map(esc).join(' • ')}</p>`:'';
    const hazards=d?.hazards?`<p><strong>Hazards:</strong> ${esc(d.hazards)}</p>`:'';
    const list=getExits(zone);
    const exitSummary=list?.length?`<details class="route-detail" open><summary>How this area connects</summary>${connectionMap(zone)}<ul class="connection-list">${list.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></details>`:`<details class="route-detail" open><summary>Area map</summary>${connectionMap(zone)}</details>`;
    return `<article class="trust-card route-card" data-zone="${esc(zone.toLowerCase())}"><small>ZONE FIELD GUIDE</small><h3>${esc(zone)}</h3>${exitSummary}${d?.access?`<p><strong>Access:</strong> ${esc(d.access)}</p>`:''}${d?.protection?`<p><strong>Sneak / Invisible:</strong> ${esc(d.protection)}</p>`:''}${hazards}${routes}${fieldGuide(zone)}${unlocks}</article>`;
  };

  function render(){
    const q=(search?.value||'').trim().toLowerCase(); const exp=type?.value||'all'; let html='';
    data.forEach(group=>{
      if(exp!=='all'&&group.id!==exp)return;
      const regions=[];
      group.regions.forEach(region=>{
        const zones=region.zones.filter(z=>!q||z.toLowerCase().includes(q)||region.name.toLowerCase().includes(q)||group.name.toLowerCase().includes(q));
        if(!zones.length)return;
        regions.push(`<details class="route-region"><summary><strong>${esc(region.name)}</strong> <span>${zones.length} areas</span></summary><div class="trust-grid">${zones.map(routeCard).join('')}</div></details>`);
      });
      if(regions.length)html+=`<details class="route-expansion"><summary><h2>${esc(group.name)}</h2></summary>${regions.join('')}</details>`;
    });
    root.innerHTML=html||'<p class="notice">No matching areas.</p>';
  }
  if(type){type.innerHTML='<option value="all">All expansions</option>'+data.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');type.addEventListener('change',render)}
  search?.addEventListener('input',render); render();
})();
