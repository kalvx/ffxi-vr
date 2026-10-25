(function(){
  const data=window.CR_WORLD_ROUTES||[];
  const details=window.CR_ROUTE_DETAILS||{};
  const exits=window.CR_ZONE_EXITS||{};
  const field=window.CR_ZONE_FIELD_GUIDES||{};
  const maps=window.CR_ZONE_MAPS||{};
  const travel=window.CR_ZONE_TRAVEL||{};
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
  const travelFor=zone=>travel[zone]||travel[Object.keys(travel).find(k=>norm(k)===norm(zone))]||null;
  const regionFor=zone=>travelFor(zone)?.region||'Other areas';
  const areaOrder=(a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true});
  const mapLink=(zone,label)=>mapFor(zone)?`<button type="button" class="zone-travel-link" data-open-map="${esc(zone)}">${esc(label)}</button>`:esc(label);
  const crystalLandmark=name=>['Holla','Dem','Mea'].includes(name)?'beside the Shattered Telepoint':'near the intact Telepoint';
  function travelSummary(zone){
    const t=travelFor(zone);if(!t)return'';
    const outpost=t.outpost?`${t.outpostNearby?'Nearby outpost':'Outpost'}: ${mapLink(t.outpost.zone,`${t.outpost.region} — ${t.outpost.zone}`)}`:'Outpost: no conquest outpost in this region';
    const crystal=t.crystals.length?`Closest crystal${t.crystals.length>1?'s':''}: ${t.crystals.map(c=>`${mapLink(c.zone,`${c.name} — ${c.zone}`)} (<a href="blue-crystals.html#${esc(c.name.toLowerCase())}">${esc(crystalLandmark(c.name))}; location</a>)`).join(' / ')}`:`Closest crystal: ${esc(t.crystalNote)}`;
    const note=t.approachNote?`<span class="zone-travel-note">${esc(t.approachNote)}</span>`:'';
    return `<div class="zone-travel"><span>${outpost}</span><span title="Closest approach by the fewest mapped land-zone connections. Tied approaches are listed together; access requirements still apply.">${crystal}</span>${note}</div>`;
  }
  const coordRe=/\[([A-N](?:\/[A-N])?)-(\d{1,2})\]/g;

  function parseExit(raw){
    const coords=[]; let m;
    coordRe.lastIndex=0;
    while((m=coordRe.exec(raw)))coords.push({x:m[1],y:Number(m[2]),raw:m[0]});
    const target=raw.split(/\s+(?=(?:Map\d+:\s*)?\[)/)[0].replace(/\s+Map\d+:$/,'').trim();
    const floors=[...raw.matchAll(/Map(\d+):/g)].map(x=>`Map ${x[1]}`);
    return {raw,target,coords,maps:floors};
  }

  let currentZone='',currentMap=0,scale=1,panX=0,panY=0,dragging=false,startX=0,startY=0;
  function applyTransform(){if(viewerImg)viewerImg.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`}
  function resetTransform(){scale=1;panX=0;panY=0;applyTransform()}
  function refreshViewerInfo(){
    const m=mapFor(currentZone); if(!m)return;
    const list=getExits(currentZone)||[];
    viewerInfo.innerHTML=`<span>${esc(regionFor(currentZone))}</span><span>Zone ID ${m.zoneId} / 0x${m.hex}</span><span>${m.maps.length} map${m.maps.length===1?'':'s'}</span><span>${list.length} mapped connection${list.length===1?'':'s'}</span>${m.source?`<span>${esc(m.source)}</span>`:''}`;
    const travelInfo=document.querySelector('#map-viewer-travel');
    if(travelInfo)travelInfo.innerHTML=travelSummary(currentZone);
  }
  function setMap(index){
    const m=mapFor(currentZone); if(!m||!m.maps[index])return;
    currentMap=index;
    viewerImg.src=m.maps[index];
    viewerImg.alt=`${currentZone} Map ${index+1}`;
    resetTransform();
    viewerTabs.innerHTML=m.maps.map((_,i)=>`<button type="button" class="map-tab${i===index?' active':''}" data-map-index="${i}">Map ${i+1}</button>`).join('');
  }
  function probeImage(url){
    return new Promise(resolve=>{
      const img=new Image();
      const done=ok=>resolve(ok?url:null);
      img.onload=()=>done(true);
      img.onerror=()=>done(false);
      img.src=url;
    });
  }
  async function probeRemoteMaps(zone,m){
    if(!m?.remoteTemplate||m.probed)return;
    m.probed=true;
    const candidates=[];
    for(let i=1;i<=9;i++)candidates.push({i,url:m.remoteTemplate.replace('{n}',i)});
    const found=await Promise.all(candidates.map(async x=>({i:x.i,url:await probeImage(x.url)})));
    found.filter(x=>x.url).sort((a,b)=>a.i-b.i).forEach(x=>{if(!m.maps.includes(x.url))m.maps.push(x.url)});
    if(currentZone===zone){refreshViewerInfo();setMap(Math.min(currentMap,m.maps.length-1))}
    document.querySelectorAll(`[data-map-count-zone="${CSS.escape(zone)}"]`).forEach(el=>{el.textContent=m.maps.length>1?` • ${m.maps.length} maps/floors`:''});
  }
  function openMap(zone){
    const m=mapFor(zone); if(!m)return;
    currentZone=zone;currentMap=0;viewerTitle.textContent=zone;
    refreshViewerInfo();
    viewer.hidden=false;document.body.classList.add('map-viewer-open');setMap(0);viewerClose?.focus();
    probeRemoteMaps(zone,m);
  }
  function closeMap(){if(!viewer)return;viewer.hidden=true;document.body.classList.remove('map-viewer-open');currentZone=''}

  viewerTabs?.addEventListener('click',e=>{const b=e.target.closest('[data-map-index]');if(b)setMap(Number(b.dataset.mapIndex))});
  document.querySelector('#map-viewer-travel')?.addEventListener('click',e=>{const b=e.target.closest('[data-open-map]');if(b)openMap(b.dataset.openMap)});
  viewerClose?.addEventListener('click',closeMap);
  viewer?.addEventListener('click',e=>{if(e.target===viewer)closeMap()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer?.hidden)closeMap()});
  zoomIn?.addEventListener('click',()=>{scale=Math.min(4,scale+.25);applyTransform()});
  zoomOut?.addEventListener('click',()=>{scale=Math.max(.5,scale-.25);applyTransform()});
  zoomReset?.addEventListener('click',resetTransform);
  viewerStage?.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.5,Math.min(4,scale+(e.deltaY<0?.15:-.15)));applyTransform()},{passive:false});
  viewerStage?.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX-panX;startY=e.clientY-panY;viewerStage.setPointerCapture(e.pointerId)});
  viewerStage?.addEventListener('pointermove',e=>{if(!dragging)return;panX=e.clientX-startX;panY=e.clientY-startY;applyTransform()});
  viewerStage?.addEventListener('pointerup',()=>{dragging=false});
  viewerStage?.addEventListener('pointercancel',()=>{dragging=false});

  const cleanStep=s=>String(s||'').replace(/\.$/,'');
  const routeDiagram=(r,i)=>{
    const steps=r.steps||[];if(!steps.length)return'';
    const nodes=steps.map((s,n)=>`<div class="route-node"><span class="route-node-num">${n+1}</span><span>${esc(cleanStep(s))}</span></div>`);
    return `<div class="route-map" aria-label="${esc(r.name||`Route ${String.fromCharCode(65+i)}`)} diagram"><div class="route-map-label">${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</div><div class="route-flow">${nodes.join('<div class="route-arrow" aria-hidden="true">➜</div>')}</div></div>`;
  };

  const dropText=m=>{
    const d=m.drops||m.drop||[];
    const list=Array.isArray(d)?d:(d?String(d).split('|'):[]);
    return list.length?`<small><b>Drops:</b> ${list.map(esc).join(' • ')}</small>`:'';
  };
  const mobCard=(m,zone)=>{
    if(window.CR_MOB_CARDS&&m.key)return window.CR_MOB_CARDS.summary(m,zone);
    const tags=[];
    if(m.level)tags.push(`Lv. ${esc(m.level)}`);
    if(m.pos)tags.push(esc(m.pos));
    if(m.spawn)tags.push(esc(m.spawn));
    const rank=m.hnm?'HNM':m.nm?'NM':'';
    return `<div class="${m.hnm?'hnm-entry':m.nm?'nm-entry':''}">${rank?`<em class="mob-rank">${rank}</em>`:''}<strong>${esc(m.name)}</strong>${tags.length?`<span>${tags.join(' • ')}</span>`:''}${m.detect?`<span>${esc(m.detect)}</span>`:''}${m.note?`<small>${esc(m.note)}</small>`:''}${dropText(m)}</div>`;
  };
  const npcCard=n=>`<div><strong>${esc(n.name)}</strong><span>${esc(n.pos||'')}</span>${n.count?`<small>${n.count} recorded ${n.count===1?'entity':'entities'} · coordinates may include scripted placeholders.</small>`:n.indexedOnly?'<small>Compendium service/story reference; no native spawn coordinates indexed.</small>':''}${n.service?`<small><b>Service:</b> ${esc(n.service)}</small>`:''}${n.note?`<small>${esc(n.note)}</small>`:''}${(n.activities||[]).map(a=>`<small>${esc(a)}</small>`).join('')}${n.points?.length?`<details><summary>All recorded locations</summary><div class="atlas-location-scroll"><table><thead><tr><th>NPC ID</th><th>X</th><th>Y</th><th>Z</th></tr></thead><tbody>${n.points.map(p=>`<tr>${p.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:''}${n.quests?.length?`<details><summary>Quests, missions & services · ${n.quests.length}</summary>${n.quests.map(q=>`<p><a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.title)} ↗</a><small>${esc(q.role||'')}${q.requirements?' · '+esc(q.requirements):''}</small></p>`).join('')}</details>`:''}${n.wares?.length?`<details><summary>Shop items · ${n.wares.length}</summary>${n.wares.map(d=>`<p><a class="atlas-item-link" data-atlas-item-id="${d.id}" href="../reference/index.html?item=${d.id}">${esc(d.name)}</a>${d.priceMin!=null?`<small>${Number(d.priceMin).toLocaleString()}${d.priceMax!==d.priceMin?'–'+Number(d.priceMax).toLocaleString():''} gil · indexed price</small>`:''}</p>`).join('')}</details>`:''}</div>`;

  const atlasItem=item=>`<a class="atlas-item-link" data-atlas-item-id="${item.id}" href="../reference/index.html?item=${item.id}">${esc(item.name)}</a>`;
  function zoneActivities(a){
    if(!a)return'';
    const gathering=(a.gathering||[]).map(g=>`<details><summary>${esc(g.kind)} · ${g.points.length} recorded points</summary><p><b>Tool:</b> ${atlasItem(g.tool)}</p>${!g.items.length||!g.points.length?'<p>Configuration is incomplete: rewards or point locations are not recorded here.</p>':''}<div class="atlas-location-scroll"><table><thead><tr><th>Obtainable item</th><th>Selection weight</th></tr></thead><tbody>${g.items.map(d=>`<tr><td>${atlasItem(d)}${d.dayElement?' · colored rock changes to the current day’s element':''}</td><td>${d.weight}</td></tr>`).join('')}</tbody></table></div><details><summary>All gathering coordinates · ${g.points.length}</summary><div class="atlas-location-scroll"><table><thead><tr><th>X</th><th>Y</th><th>Z</th></tr></thead><tbody>${g.points.map(p=>`<tr>${p.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></details>`).join('');
    const waters=(a.fishing||[]).map(w=>`<details><summary>${esc(w.name)} · ${w.items.length} fishing candidates</summary>${w.center.some(v=>v!==0)?`<p>Recorded area center: X ${w.center[0]}, Y ${w.center[1]}, Z ${w.center[2]}${w.radius?' · boundary radius '+w.radius:''}. This is an area reference, not a guaranteed casting position.</p>`:''}<div class="atlas-location-scroll"><table><thead><tr><th>Catch</th><th>Fishing skill / water</th><th>Bait affinity</th><th>Preferences / requirements</th></tr></thead><tbody>${w.items.map(f=>`<tr><td>${atlasItem(f)}<small>Pool weight ${f.weight}</small></td><td>${f.skill} · ${esc(f.water)}</td><td>${f.baits.map(b=>`${atlasItem(b)} (${b.affinity})`).join('<br>')||'No specific bait affinity indexed'}</td><td>${[...f.preferences,f.keyItem?'Requires '+f.keyItem:'',f.questOnly?'Quest-only catch':''].filter(Boolean).map(esc).join(' · ')||'No additional preference recorded'}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
    const digging=a.digging?.length?`<details><summary>Chocobo digging · ${a.digging.length} reward records</summary><div class="atlas-location-scroll"><table><thead><tr><th>Item</th><th>Method</th><th>Rank</th><th>Selection weight</th></tr></thead><tbody>${a.digging.map(d=>`<tr><td>${esc(d.name)}</td><td>${esc(d.method)}</td><td>${esc(d.rank)}</td><td>${d.weight}</td></tr>`).join('')}</tbody></table></div><p><a href="../crafting/chocobo.html" target="_blank" rel="noopener">Digging methods and requirements ↗</a></p></details>`:'';
    return gathering||waters||digging?`<details class="field-panel"><summary>Gathering, fishing & digging</summary><p class="atlas-detail-note">Recorded candidates and point locations. Selection weights and bait affinities are not percentages. Tools, skill, weather/day, equipment, quests and available stock affect results. Fishing preference patterns describe bonuses or penalties, not exclusive catch windows.</p>${gathering}${waters?`<h4>Fishing waters</h4><p><a href="../fishing/index.html" target="_blank" rel="noopener">Fishing equipment and skill routes ↗</a></p>${waters}`:''}${digging}</details>`:'';
  }
  function fieldGuide(zone){
    const g=getField(zone);if(!g)return'';
    const regular=(g.mobs||[]).filter(m=>!m.nm&&!m.hnm);
    const nms=[...(g.nms||[]),...(g.mobs||[]).filter(m=>m.nm&&!m.hnm)];
    const hnms=[...(g.hnms||[]),...(g.mobs||[]).filter(m=>m.hnm)];
    const mobTotal=regular.length+nms.length+hnms.length;
    const danger=[...regular,...nms,...hnms].filter(m=>m.aggressive||m.trueDetection||m.links);
    const avoidance=m=>{const senses=m.detects||[];return[m.trueDetection?'True detection bypasses ordinary Sneak/Invisible.':m.aggressive?[senses.includes('Sight')?'Use Invisible against sight.':'',senses.includes('Sound')?'Use Sneak against sound.':''].filter(Boolean).join(' '):'',senses.includes('Magic')?'Avoid casting nearby.':'',senses.includes('Low HP')?'Keep HP above the low-HP detection threshold.':'',m.links?'Avoid fighting beside others of its family.':''].filter(Boolean).join(' ')};
    const hazards=danger.length?`<details class="route-detail route-hazard-auto"><summary><strong>Route hazards & how to avoid them</strong> <span>${danger.length}</span></summary><div class="route-hazard-list">${danger.map(m=>`<div class="route-hazard-row"><strong>${esc(m.name)}</strong><span>${esc(m.detect)}</span><small>${esc(avoidance(m))}</small></div>`).join('')}</div></details>`:'';
    const mobTools=mobTotal?`<div class="mob-view-tools"><button type="button" class="mob-grid-open" data-open-mob-grid="${esc(zone)}"><span aria-hidden="true">▦</span> Open monster card grid <small>${mobTotal}</small></button><span>The compact list stays available below.</span></div>`:'';
    const mobs=regular.length?`<details class="field-panel"><summary>Mobs, levels, detection & drops <span>${regular.length}</span></summary><div class="field-grid mob-grid">${regular.map(m=>mobCard(m,zone)).join('')}</div></details>`:'';
    const notorious=(nms.length||hnms.length)?`<details class="field-panel notorious-panel"><summary>Notorious Monsters & HNMs <span>${nms.length+hnms.length}</span></summary>${hnms.length?`<h4>HNMs</h4><div class="field-grid hnm-grid">${hnms.map(m=>mobCard(m,zone)).join('')}</div>`:''}${nms.length?`<h4>Notorious Monsters</h4><div class="field-grid nm-grid">${nms.map(m=>mobCard(m,zone)).join('')}</div>`:''}</details>`:'';
    const npcs=g.npcs?.length?`<details class="field-panel"><summary>NPCs & zone objects <span>${g.npcs.length}</span></summary><div class="field-grid">${g.npcs.map(npcCard).join('')}</div></details>`:'';
    const dig=g.dig?.length?`<details class="field-panel"><summary>Chocobo digging / gathering</summary><p>${g.dig.map(esc).join(' • ')}</p></details>`:'';
    const items=g.items?.length?`<details class="field-panel"><summary>Zone items, chests & gathering</summary><p>${g.items.map(esc).join(' • ')}</p></details>`:'';
    const note=g.sourceNote?`<p class="field-source">${esc(g.sourceNote)}</p>`:'';
    const stories=g.stories?.length?`<details class="field-panel"><summary>Zone quests, missions & services <span>${g.stories.length}</span></summary><p>Indexed NPC connections. Guides open separately so this atlas stays loaded.</p>${g.stories.map(q=>`<p><a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.title)} ↗</a> <small>${esc(q.role||'')}</small></p>`).join('')}</details>`:'';
    const query=(search?.value||'').trim().toLowerCase();
    const matchedMobs=query?[...regular,...nms,...hnms].filter(m=>[m.name,...(window.CR_MOB_CARDS?.dropNames(m)||[])].join(' ').toLowerCase().includes(query)):[];
    const matchedNPCs=query?(g.npcs||[]).filter(n=>[n.name,...(n.wares||[]).map(d=>d.name),...(n.quests||[]).map(q=>q.title)].join(' ').toLowerCase().includes(query)):[];
    const activityMatches=[];
    if(query&&g.activities){
      for(const group of g.activities.gathering)for(const item of group.items)if(item.name.toLowerCase().includes(query))activityMatches.push({item,label:`${group.kind} · ${group.points.length} recorded points`});
      for(const water of g.activities.fishing)for(const item of water.items)if(item.name.toLowerCase().includes(query))activityMatches.push({item,label:`Fishing · ${water.name} · Fishing skill ${item.skill}`});
      for(const item of g.activities.digging)if(item.name.toLowerCase().includes(query))activityMatches.push({item,label:`Chocobo digging · ${item.method} · ${item.rank}`});
    }
    const matches=matchedMobs.length||matchedNPCs.length||activityMatches.length?`<details class="field-panel atlas-matching-records" open><summary>Matching records <span>${matchedMobs.length+matchedNPCs.length+activityMatches.length}</span></summary><div class="field-grid">${matchedMobs.slice(0,8).map(m=>mobCard(m,zone)).join('')}${matchedNPCs.slice(0,8).map(npcCard).join('')}${activityMatches.slice(0,8).map(({item,label})=>`<div>${item.id?atlasItem(item):`<strong>${esc(item.name)}</strong>`}<small>${esc(label)}</small><small>Open Gathering, fishing & digging below for the full source table.</small></div>`).join('')}</div>${matchedMobs.length>8||matchedNPCs.length>8||activityMatches.length>8?'<p>First eight matches of each type shown. The full lists and searchable monster grid are below.</p>':''}</details>`:'';
    return matches+hazards+mobTools+mobs+notorious+npcs+stories+zoneActivities(g.activities)+dig+items+note;
  }

  const mapPreview=zone=>{
    const m=mapFor(zone);if(!m)return'';
    return `<button type="button" class="real-map-preview" data-open-map="${esc(zone)}" aria-label="Open large map for ${esc(zone)}"><img data-map-preview="${esc(zone)}" src="${esc(m.maps[0])}" alt="${esc(zone)} map preview" loading="lazy"><span><strong>Open full map</strong><small>Zoom • pan<span data-map-count-zone="${esc(zone)}">${m.maps.length>1?` • ${m.maps.length} maps/floors`:''}</span></small></span></button>`;
  };

  const exitList=zone=>{
    const list=getExits(zone);
    if(list===null)return`<p class="route-empty">Exit data is still being matched for this area.</p>`;
    if(!list.length)return`<p class="route-empty">No conventional walkable exits.</p>`;
    return `<div class="exit-list">${list.map(raw=>{const p=parseExit(raw),coords=p.coords.map(c=>c.raw).join(' / ')||'Connection';return`<button type="button" class="exit-row" data-open-zone="${esc(p.target)}"><span class="exit-dest">${esc(p.target)}</span><span class="exit-coord">${esc(coords)}</span></button>`}).join('')}</div>`;
  };

  const dbLoader=zone=>{
    const m=mapFor(zone);
    if(!m||!window.CR_ZONE_DB)return'';
    const loaded=getField(zone)?.dbLoaded;
    return `<div class="zone-db-load"><button type="button" data-load-zone-db="${esc(zone)}" ${loaded?'disabled':''}>${loaded?'Server records loaded':'Load zone records'}</button><span class="zone-db-status" data-zone-db-status="${esc(zone)}">${loaded?'Current Reality records ready.':'Zone records load automatically and stay cached.'}</span></div>`;
  };

  function mergeDbGuide(zone,incoming){
    const k=fieldKeyFor(zone)||zone,old=field[k]||{};
    if(incoming.npcs){const annotations=new Map((old.npcs||[]).map(n=>[n.name.toLowerCase(),n]));incoming={...incoming,npcs:incoming.npcs.map(n=>{const previous=annotations.get(n.name.toLowerCase());return previous?{...previous,...n}:n})}}
    field[k]={...old,...incoming,dbLoaded:true};if(k!==zone)field[zone]=field[k];
    updateCard(zone);
    window.dispatchEvent(new CustomEvent('cr:zone-loaded',{detail:{zone}}));
  }
  function updateCard(zone){
    const card=[...root.querySelectorAll('.route-card')].find(card=>card.dataset.zone===zone.toLowerCase());if(!card)return;
    const label=node=>(node.querySelector('summary')?.textContent||'').replace(/\s+/g,' ').trim().replace(/\s+\d+$/,'');
    const states=new Map([...card.querySelectorAll('details')].map(node=>[label(node),node.open]));
    const template=document.createElement('template');template.innerHTML=routeCard(zone);const replacement=template.content.firstElementChild;
    replacement.querySelectorAll('details').forEach(node=>{if(states.has(label(node)))node.open=states.get(label(node))});card.replaceWith(replacement);
  }

  const routeCard=zone=>{
    const d=details[zone];
    const routes=d?.routes?.length?(d.routes||[]).map((r,i)=>`<details class="route-detail"><summary>${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</summary>${routeDiagram(r,i)}<ol class="guide-steps">${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`).join(''):'';
    const unlocks=d?.unlocks?.length?`<p><strong>Unlock on the way:</strong> ${d.unlocks.map(esc).join(' • ')}</p>`:'';
    const hazards=d?.hazards?`<p><strong>Hazards:</strong> ${esc(d.hazards)}</p>`:'';
    const list=getExits(zone),summaryBits=[];
    if(list?.length)summaryBits.push(`${list.length} exit${list.length===1?'':'s'}`);
    const g=getField(zone);
    if(g?.npcs?.length)summaryBits.push(`${g.npcs.length} NPC${g.npcs.length===1?'':'s'}`);
    const mobCount=(g?.mobs?.length||0)+(g?.nms?.length||0)+(g?.hnms?.length||0);
    if(mobCount)summaryBits.push(`${mobCount} mob/NM entr${mobCount===1?'y':'ies'}`);
    summaryBits.push(regionFor(zone));
    const quick=summaryBits.length?`<div class="zone-quick">${summaryBits.map(esc).join(' • ')}</div>`:'';
    const exitsPanel=`<details class="route-detail exits-panel"><summary>Exits & connections</summary>${exitList(zone)}</details>`;
    return `<article class="trust-card route-card" data-zone="${esc(zone.toLowerCase())}"><small>ZONE FIELD GUIDE</small><h3>${esc(zone)}</h3>${mapPreview(zone)}${quick}${travelSummary(zone)}${exitsPanel}${d?.access?`<p><strong>Access:</strong> ${esc(d.access)}</p>`:''}${d?.protection?`<p><strong>Sneak / Invisible:</strong> ${esc(d.protection)}</p>`:''}${hazards}${routes}${dbLoader(zone)}${fieldGuide(zone)}${unlocks}</article>`;
  };

  root.addEventListener('click',e=>{
    const mapButton=e.target.closest('[data-open-map]');
    if(mapButton){openMap(mapButton.dataset.openMap);return}
    const dbButton=e.target.closest('[data-load-zone-db]');
    if(dbButton){
      const zone=dbButton.dataset.loadZoneDb,m=mapFor(zone),status=root.querySelector(`[data-zone-db-status="${CSS.escape(zone)}"]`);
      if(!m||!window.CR_ZONE_DB)return;
      dbButton.disabled=true;dbButton.textContent='Loading zone database…';
      window.CR_ZONE_DB.loadZone(m.zoneId,msg=>{if(status)status.textContent=msg},zone).then(g=>{mergeDbGuide(zone,g)}).catch(err=>{dbButton.disabled=false;dbButton.textContent='Retry zone records';if(status)status.textContent=`Could not load zone records: ${err.message}`});
      return;
    }
    const exitButton=e.target.closest('[data-open-zone]');
    if(exitButton){const zone=exitButton.dataset.openZone;if(mapFor(zone))openMap(zone)}
  });
  root.addEventListener('error',e=>{
    const img=e.target.closest?.('[data-map-preview]');
    if(!img)return;
    const button=img.closest('.real-map-preview');
    if(button){button.classList.add('map-unavailable');button.disabled=true;button.title='No map image is available in the current map pack'}
  },true);

  function render(){
    const q=(search?.value||'').trim().toLowerCase(),exp=type?.value||'all';let html='';
    data.forEach(group=>{
      if(exp!=='all'&&group.id!==exp)return;
      const regions=[];
      const grouped=new Map();
      [...new Set(group.regions.flatMap(region=>region.zones))].forEach(zone=>{
        const region=regionFor(zone);
        if(!grouped.has(region))grouped.set(region,[]);
        grouped.get(region).push(zone);
      });
      [...grouped.keys()].sort(areaOrder).forEach(name=>{
        const region={name,zones:grouped.get(name).sort(areaOrder)};
        const zones=region.zones.filter(z=>!q||[z,region.name,group.name,window.CR_ATLAS_INDEX?.areas[z]?.search||''].join(' ').toLowerCase().includes(q));
        if(!zones.length)return;
        regions.push(`<details class="route-region" open><summary><strong>${esc(region.name)}</strong> <span>${zones.length} ${zones.length===1?'area':'areas'}</span></summary><div class="trust-grid">${zones.map(routeCard).join('')}</div></details>`);
      });
      if(regions.length)html+=`<details class="route-expansion" open><summary><h2>${esc(group.name)}</h2></summary>${regions.join('')}</details>`;
    });
    root.innerHTML=html||'<p class="notice">No matching areas.</p>';
  }
  window.CR_ATLAS={merge:mergeDbGuide,openMap,render,failed:zone=>{const node=[...root.querySelectorAll('[data-zone-db-status]')].find(node=>node.dataset.zoneDbStatus===zone);if(node)node.textContent='Records unavailable. Retry without losing completed zones.'}};
  if(type){type.innerHTML='<option value="all">All expansions</option>'+data.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');type.addEventListener('change',render)}
  search?.addEventListener('input',render);render();
})();
