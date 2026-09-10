(function(){
  const data=window.CR_WORLD_ROUTES||[];
  const details=window.CR_ROUTE_DETAILS||{};
  const exits=window.CR_ZONE_EXITS||{};
  const field=window.CR_ZONE_FIELD_GUIDES||{};
  const maps=window.CR_ZONE_MAPS||{};
  const root=document.querySelector('#world-route-root');
  const search=document.querySelector('#route-search');
  const type=document.querySelector('#route-expansion');
  const viewer=document.querySelector('#zone-map-viewer');
  const viewerTitle=document.querySelector('#map-viewer-title');
  const viewerStage=document.querySelector('#map-viewer-stage');
  const viewerImg=document.querySelector('#map-viewer-image');
  const viewerTabs=document.querySelector('#map-viewer-tabs');
  const viewerInfo=document.querySelector('#map-viewer-info');
  const viewerClose=document.querySelector('#map-viewer-close');
  const zoomOut=document.querySelector('#map-zoom-out');
  const zoomIn=document.querySelector('#map-zoom-in');
  const zoomReset=document.querySelector('#map-zoom-reset');
  if(!root)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/\[s\]/g,'(s)').replace(/#/g,'').replace(/the celestial nexus/g,'celestial nexus').replace(/[^a-z0-9()' ]+/g,' ').replace(/\s+/g,' ').trim();
  const keyFor=zone=>Object.keys(exits).find(k=>norm(k)===norm(zone));
  const fieldKeyFor=zone=>Object.keys(field).find(k=>norm(k)===norm(zone));
  const getExits=zone=>{const k=keyFor(zone);return k?exits[k]:null};
  const getField=zone=>{const k=fieldKeyFor(zone);return k?field[k]:null};
  const mapFor=zone=>maps[zone]||maps[Object.keys(maps).find(k=>norm(k)===norm(zone))]||null;
  const coordRe=/\[([A-N](?:\/[A-N])?)-(\d{1,2})\]/g;

  function parseExit(raw){
    const coords=[];let m;coordRe.lastIndex=0;
    while((m=coordRe.exec(raw)))coords.push({x:m[1],y:Number(m[2]),raw:m[0]});
    const target=raw.split(/\s+(?=(?:Map\d+:\s*)?\[)/)[0].replace(/\s+Map\d+:$/,'').trim();
    const floors=[...raw.matchAll(/Map(\d+):/g)].map(x=>`Map ${x[1]}`);
    return {raw,target,coords,maps:floors};
  }

  let currentZone='',currentMap=0,scale=1,panX=0,panY=0,dragging=false,startX=0,startY=0;
  function applyTransform(){if(viewerImg)viewerImg.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`}
  function resetTransform(){scale=1;panX=0;panY=0;applyTransform()}
  function refreshViewerInfo(){
    const m=mapFor(currentZone);if(!m)return;const list=getExits(currentZone)||[];
    viewerInfo.innerHTML=`<span>Zone ID ${m.zoneId} / 0x${m.hex}</span><span>${m.maps.length} map${m.maps.length===1?'':'s'}</span><span>${list.length} mapped connection${list.length===1?'':'s'}</span>${m.source?`<span>${esc(m.source)}</span>`:''}`;
  }
  function setMap(index){
    const m=mapFor(currentZone);if(!m||!m.maps[index])return;
    currentMap=index;viewerImg.src=m.maps[index];viewerImg.alt=`${currentZone} Map ${index+1}`;resetTransform();
    viewerTabs.innerHTML=m.maps.map((_,i)=>`<button type="button" class="map-tab${i===index?' active':''}" data-map-index="${i}">Map ${i+1}</button>`).join('');
  }
  function probeImage(url){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(url);img.onerror=()=>resolve(null);img.src=url})}
  async function probeRemoteMaps(zone,m){
    if(!m?.remoteTemplate||m.probed)return;m.probed=true;
    const candidates=[];for(let i=1;i<=9;i++)candidates.push({i,url:m.remoteTemplate.replace('{n}',i)});
    const found=await Promise.all(candidates.map(async x=>({i:x.i,url:await probeImage(x.url)})));
    found.filter(x=>x.url).sort((a,b)=>a.i-b.i).forEach(x=>{if(!m.maps.includes(x.url))m.maps.push(x.url)});
    if(currentZone===zone){refreshViewerInfo();setMap(Math.min(currentMap,m.maps.length-1))}
    document.querySelectorAll(`[data-map-count-zone="${CSS.escape(zone)}"]`).forEach(el=>{el.textContent=m.maps.length>1?` • ${m.maps.length} maps/floors`:''});
  }
  function openMap(zone){
    const m=mapFor(zone);if(!m)return;currentZone=zone;currentMap=0;viewerTitle.textContent=zone;refreshViewerInfo();
    viewer.hidden=false;document.body.classList.add('map-viewer-open');setMap(0);viewerClose?.focus();probeRemoteMaps(zone,m);
  }
  function closeMap(){if(!viewer)return;viewer.hidden=true;document.body.classList.remove('map-viewer-open');currentZone=''}

  viewerTabs?.addEventListener('click',e=>{const b=e.target.closest('[data-map-index]');if(b)setMap(Number(b.dataset.mapIndex))});
  viewerClose?.addEventListener('click',closeMap);viewer?.addEventListener('click',e=>{if(e.target===viewer)closeMap()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer?.hidden)closeMap()});
  zoomIn?.addEventListener('click',()=>{scale=Math.min(4,scale+.25);applyTransform()});zoomOut?.addEventListener('click',()=>{scale=Math.max(.5,scale-.25);applyTransform()});zoomReset?.addEventListener('click',resetTransform);
  viewerStage?.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.5,Math.min(4,scale+(e.deltaY<0?.15:-.15)));applyTransform()},{passive:false});
  viewerStage?.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX-panX;startY=e.clientY-panY;viewerStage.setPointerCapture(e.pointerId)});
  viewerStage?.addEventListener('pointermove',e=>{if(!dragging)return;panX=e.clientX-startX;panY=e.clientY-startY;applyTransform()});viewerStage?.addEventListener('pointerup',()=>{dragging=false});viewerStage?.addEventListener('pointercancel',()=>{dragging=false});

  const cleanStep=s=>String(s||'').replace(/\.$/,'');
  const routeDiagram=(r,i)=>{const steps=r.steps||[];if(!steps.length)return'';const nodes=steps.map((s,n)=>`<div class="route-node"><span class="route-node-num">${n+1}</span><span>${esc(cleanStep(s))}</span></div>`);return `<div class="route-map" aria-label="${esc(r.name||`Route ${String.fromCharCode(65+i)}`)} diagram"><div class="route-map-label">${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</div><div class="route-flow">${nodes.join('<div class="route-arrow" aria-hidden="true">➜</div>')}</div></div>`};

  const dropText=m=>{const d=m.drops||m.drop||[],list=Array.isArray(d)?d:(d?String(d).split('|'):[]);return list.length?`<small><b>Drops:</b> ${list.map(esc).join(' • ')}</small>`:''};
  const mobCard=m=>{const tags=[];if(m.level)tags.push(`Lv. ${esc(m.level)}`);if(m.pos)tags.push(esc(m.pos));if(m.spawn)tags.push(esc(m.spawn));const rank=m.hnm?'HNM':m.nm?'NM':'';return `<div class="${m.hnm?'hnm-entry':m.nm?'nm-entry':''}">${rank?`<em class="mob-rank">${rank}</em>`:''}<strong>${esc(m.name)}</strong>${tags.length?`<span>${tags.join(' • ')}</span>`:''}${m.detect?`<span>${esc(m.detect)}</span>`:''}${m.note?`<small>${esc(m.note)}</small>`:''}${dropText(m)}</div>`};
  const npcCard=n=>`<div><strong>${esc(n.name)}</strong><span>${esc(n.pos||'')}</span>${n.service?`<small><b>Service:</b> ${esc(n.service)}</small>`:''}${n.note?`<small>${esc(n.note)}</small>`:''}</div>`;

  function fieldGuide(zone){
    const g=getField(zone);if(!g)return'';
    const regular=(g.mobs||[]).filter(m=>!m.nm&&!m.hnm),nms=[...(g.nms||[]),...(g.mobs||[]).filter(m=>m.nm&&!m.hnm)],hnms=[...(g.hnms||[]),...(g.mobs||[]).filter(m=>m.hnm)];
    const mobs=regular.length?`<details class="field-panel"><summary>Mobs, levels, detection & drops <span>${regular.length}</span></summary><div class="field-grid mob-grid">${regular.map(mobCard).join('')}</div></details>`:'';
    const notorious=(nms.length||hnms.length)?`<details class="field-panel notorious-panel" open><summary>Notorious Monsters & HNMs <span>${nms.length+hnms.length}</span></summary>${hnms.length?`<h4>HNMs</h4><div class="field-grid hnm-grid">${hnms.map(mobCard).join('')}</div>`:''}${nms.length?`<h4>Notorious Monsters</h4><div class="field-grid nm-grid">${nms.map(mobCard).join('')}</div>`:''}</details>`:'';
    const npcs=g.npcs?.length?`<details class="field-panel"><summary>Notable NPCs <span>${g.npcs.length}</span></summary><div class="field-grid">${g.npcs.map(npcCard).join('')}</div></details>`:'';
    const dig=g.dig?.length?`<details class="field-panel"><summary>Chocobo digging / gathering</summary><p>${g.dig.map(esc).join(' • ')}</p></details>`:'';
    const items=g.items?.length?`<details class="field-panel"><summary>Zone items, chests & gathering</summary><p>${g.items.map(esc).join(' • ')}</p></details>`:'';
    const note=g.sourceNote?`<p class="field-source">${esc(g.sourceNote)}</p>`:'';return mobs+notorious+npcs+dig+items+note;
  }

  const mapPreview=zone=>{const m=mapFor(zone);if(!m)return'';return `<button type="button" class="real-map-preview" data-open-map="${esc(zone)}" aria-label="Open large map for ${esc(zone)}"><img data-map-preview="${esc(zone)}" src="${esc(m.maps[0])}" alt="${esc(zone)} map preview" loading="lazy"><span><strong>Open full map</strong><small>Zoom • pan<span data-map-count-zone="${esc(zone)}">${m.maps.length>1?` • ${m.maps.length} maps/floors`:''}</span></small></span></button>`};
  const exitList=zone=>{const list=getExits(zone);if(list===null)return`<p class="route-empty">Exit data is still being matched for this area.</p>`;if(!list.length)return`<p class="route-empty">No conventional walkable exits.</p>`;return `<div class="exit-list">${list.map(raw=>{const p=parseExit(raw),coords=p.coords.map(c=>c.raw).join(' / ')||'Connection';return `<button type="button" class="exit-row" data-open-zone="${esc(p.target)}"><span class="exit-dest">${esc(p.target)}</span><span class="exit-coord">${esc(coords)}</span></button>`}).join('')}</div>`};

  const routeCard=zone=>{const d=details[zone],routes=d?.routes?.length?(d.routes||[]).map((r,i)=>`<details class="route-detail"><summary>${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</summary>${routeDiagram(r,i)}<ol class="guide-steps">${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`).join(''):'',unlocks=d?.unlocks?.length?`<p><strong>Unlock on the way:</strong> ${d.unlocks.map(esc).join(' • ')}</p>`:'',hazards=d?.hazards?`<p><strong>Hazards:</strong> ${esc(d.hazards)}</p>`:'',list=getExits(zone),summaryBits=[];if(list?.length)summaryBits.push(`${list.length} exit${list.length===1?'':'s'}`);const g=getField(zone);if(g?.npcs?.length)summaryBits.push(`${g.npcs.length} NPC${g.npcs.length===1?'':'s'}`);const mobCount=(g?.mobs?.length||0)+(g?.nms?.length||0)+(g?.hnms?.length||0);if(mobCount)summaryBits.push(`${mobCount} mob/NM entr${mobCount===1?'y':'ies'}`);const quick=summaryBits.length?`<div class="zone-quick">${summaryBits.map(esc).join(' • ')}</div>`:'',exitsPanel=`<details class="route-detail exits-panel"><summary>Exits & connections</summary>${exitList(zone)}</details>`;return `<article class="trust-card route-card" data-zone="${esc(zone.toLowerCase())}"><small>ZONE FIELD GUIDE</small><h3>${esc(zone)}</h3>${mapPreview(zone)}${quick}${exitsPanel}${d?.access?`<p><strong>Access:</strong> ${esc(d.access)}</p>`:''}${d?.protection?`<p><strong>Sneak / Invisible:</strong> ${esc(d.protection)}</p>`:''}${hazards}${routes}${fieldGuide(zone)}${unlocks}</article>`};

  root.addEventListener('click',e=>{const mapButton=e.target.closest('[data-open-map]');if(mapButton){openMap(mapButton.dataset.openMap);return}const exitButton=e.target.closest('[data-open-zone]');if(exitButton){const zone=exitButton.dataset.openZone;if(mapFor(zone))openMap(zone)}});
  root.addEventListener('error',e=>{const img=e.target.closest?.('[data-map-preview]');if(!img)return;const button=img.closest('.real-map-preview');if(button){button.classList.add('map-unavailable');button.disabled=true;button.title='No map image is available in the current map pack'}},true);

  function render(){const q=(search?.value||'').trim().toLowerCase(),exp=type?.value||'all';let html='';data.forEach(group=>{if(exp!=='all'&&group.id!==exp)return;const regions=[];group.regions.forEach(region=>{const zones=region.zones.filter(z=>!q||z.toLowerCase().includes(q)||region.name.toLowerCase().includes(q)||group.name.toLowerCase().includes(q));if(!zones.length)return;regions.push(`<details class="route-region" open><summary><strong>${esc(region.name)}</strong> <span>${zones.length} areas</span></summary><div class="trust-grid">${zones.map(routeCard).join('')}</div></details>`)});if(regions.length)html+=`<details class="route-expansion" open><summary><h2>${esc(group.name)}</h2></summary>${regions.join('')}</details>`});root.innerHTML=html||'<p class="notice">No matching areas.</p>'}
  if(type){type.innerHTML='<option value="all">All expansions</option>'+data.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');type.addEventListener('change',render)}search?.addEventListener('input',render);render();
})();