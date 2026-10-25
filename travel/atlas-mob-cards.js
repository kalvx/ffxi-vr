// Shared mob hover cards and in-place details. Never navigate the atlas away.
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const index=window.CR_ATLAS_INDEX,rules=index.rules;
  const all=zone=>{const g=window.CR_ZONE_FIELD_GUIDES[zone]||{};return[...(g.mobs||[]),...(g.nms||[]),...(g.hnms||[])]};
  const find=(zone,key)=>all(zone).find(m=>m.key===key);
  const itemLink=(id,name)=>`<a href="../reference/index.html?item=${id}" class="atlas-item-link" data-atlas-item-id="${id}">${esc(name)}</a>`;
  const drops=m=>{
    const shared=(m.shared||[]).map(id=>({id,name:rules[id].name,shared:true}));
    return [...shared.filter(d=>['seal','crystal'].includes(rules[d.id].kind)).sort((a,b)=>a.id-b.id),...(m.drops||[]),...shared.filter(d=>!['seal','crystal'].includes(rules[d.id].kind))];
  };
  function summary(m,zone){
    const list=drops(m),rank=m.hnm?'HNM':m.nm?'NM':'Mob';
    return `<div class="atlas-mob ${m.hnm?'hnm-entry':m.nm?'nm-entry':''}"><button type="button" class="atlas-mob-name" data-mob-key="${esc(m.key)}" data-mob-zone="${esc(zone)}">${esc(m.name)}</button><span class="atlas-mob-rank">${rank}</span><span>Lv. ${esc(m.level)} · ${m.spawnCount} spawn records · ${m.locationCount} mapped positions</span><span>${esc(m.detect)}</span><div class="atlas-drop-chips">${list.slice(0,6).map(d=>`<span${d.shared?' class="atlas-shared-drop"':''}>${itemLink(d.id,d.name)}${d.shared?' <b title="Conditions apply">◇</b>':''}</span>`).join('')}${list.length>6?`<button type="button" data-mob-key="${esc(m.key)}" data-mob-zone="${esc(zone)}">+${list.length-6} drops</button>`:list.length?'':'<small>No indexed loot</small>'}</div></div>`;
  }
  window.CR_MOB_CARDS={summary,dropNames:m=>drops(m).map(d=>d.name)};
  function modal(id,title){
    const node=document.createElement('div');node.id=id;node.className='atlas-detail-overlay';node.hidden=true;node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-labelledby',id+'-title');
    node.innerHTML=`<section class="atlas-detail-shell"><header><h2 id="${id}-title">${title}</h2><button type="button" data-atlas-close aria-label="Close ${title}">×</button></header><div class="atlas-detail-content"></div></section>`;
    document.body.append(node);return node;
  }
  const mobModal=modal('atlas-mob-detail','Monster details'),itemModal=modal('atlas-item-detail','Item details');
  const preview=document.createElement('aside');preview.id='atlas-mob-preview';preview.hidden=true;preview.setAttribute('role','tooltip');document.body.append(preview);
  let mobContext=null,pointLimit=40,returnMob=null,returnItem=null,hoverTimer,hoverSource,itemRequest=0;
  function hidePreview(){preview.hidden=true;hoverSource?.removeAttribute('aria-describedby');hoverSource=null;clearTimeout(hoverTimer)}
  function close(node){node.hidden=true;const back=node===itemModal?returnItem:returnMob;if(back?.isConnected)back.focus({preventScroll:true});document.body.classList.toggle('atlas-detail-open',!mobModal.hidden||!itemModal.hidden)}
  for(const node of [mobModal,itemModal]){
    node.addEventListener('click',e=>{if(e.target===node||e.target.closest('[data-atlas-close]'))close(node)});
  }
  function body(m,zone,hover=false){
    const rank=m.hnm?'HNM':m.nm?'Notorious Monster':'Monster',list=drops(m);
    return `<p class="atlas-detail-kicker">${esc(rank)} · ${esc(zone)} · Lv. ${esc(m.level)}</p><h3>${esc(m.name)}</h3><p>${esc(m.families.join(' / '))} · ${m.spawnCount} spawn records · ${m.locationCount} mapped positions</p><p>${esc(m.detect)}</p>${m.spawnTypes.length?`<p><b>Spawn conditions:</b> ${esc(m.spawnTypes.join(' · '))}</p>`:''}${m.respawns.some(n=>n>0)?`<p><b>Recorded respawn:</b> ${m.respawns.filter(n=>n>0).map(n=>n<60?n+' sec':Math.round(n/60)+' min').join(' / ')}. Scripts may override this.</p>`:''}${hover?`<div class="atlas-drop-chips">${list.slice(0,10).map(d=>`<span>${itemLink(d.id,d.name)}${d.shared?' ◇':''}</span>`).join('')}</div><button type="button" data-mob-key="${esc(m.key)}" data-mob-zone="${esc(zone)}">Open all details & locations</button>`:''}`;
  }
  function renderMob(){
    if(!mobContext)return;const {m,zone}=mobContext;
    mobModal.querySelector('h2').textContent=m.name;
    const actual=m.drops||[],shared=(m.shared||[]).map(id=>[id,rules[id]]).sort((a,b)=>{const rank=r=>r.kind==='seal'?0:r.kind==='crystal'?1:2;return rank(a[1])-rank(b[1])||a[0]-b[0]});
    mobModal.querySelector('.atlas-detail-content').innerHTML=body(m,zone)+
      `<div class="atlas-detail-actions"><button type="button" data-detail-map="${esc(zone)}">Open zone map</button><span>Coordinates below use the server’s X / Y / Z.</span></div><h3>Drops</h3>${actual.length?`<div class="atlas-loot-list">${actual.map(d=>`<article>${itemLink(d.id,d.name)}${d.methods.map(method=>`<small>${method.rate!=null?`${method.rate}% base chance per roll`:'Scripted reward'}${method.levelMin?` · Recorded Lv. ${method.levelMin}–${method.levelMax}`:''}${method.configuredThreshold?' · Configured threshold '+method.configuredThreshold+'%; probability capped at 100%.':''}${method.note?' · '+esc(method.note):''}</small>`).join('')}</article>`).join('')}</div><p class="atlas-detail-note">Base chances can change with server bonuses and Treasure Hunter. Entries mentioning Steal or Despoil include that acquisition method.</p>`:'<p>No direct loot table or scripted reward has been indexed for this monster.</p>'}`+
      (shared.length?`<h3>Conditional shared drops</h3>${shared.some(([,r])=>r.kind==='seal')?'<p class="atlas-detail-note">Seal rolls are separate from ordinary loot. Treasure Hunter does not increase the seal roll. Any seal or crest received starts the shared five-minute cooldown.</p>':''}<p class="atlas-detail-note">◇ These are eligible drops, not guaranteed rewards. The defeated monster’s actual level and the conditions below must qualify.</p><div class="atlas-loot-list">${shared.map(([id,rule])=>`<article>${itemLink(id,rule.name)}<small>${esc(rule.description)}</small><small>${esc(rule.rateNote)}</small></article>`).join('')}</div>`:'')+
      `<h3>Spawn locations · ${m.spawnCount} records</h3><p class="atlas-detail-note">${m.mappedCount} records have placed coordinates across ${m.locationCount} distinct positions. These are potential spawn slots, not the number alive now. Origin placeholders and scripted slots are identified below.</p><div class="atlas-location-scroll"><table><thead><tr><th>Spawn ID</th><th>X</th><th>Y</th><th>Z</th><th>Location type</th></tr></thead><tbody>${m.points.slice(0,pointLimit).map(point=>`<tr>${point.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${pointLimit<m.points.length?'<button type="button" data-more-points>Show 40 more locations</button>':''}<h3>Other zones</h3><div id="atlas-other-zones">Loading matching monster locations…</div>`;
    const context=mobContext;
    window.CR_ZONE_DB.resource('bestiary-index.json','bestiary/'+index.version).then(catalog=>{
      if(context!==mobContext)return;
      const rows=(catalog[m.key]||[]).filter(row=>row.zone!==zone);
      mobModal.querySelector('#atlas-other-zones').innerHTML=rows.length?rows.map(row=>`<button type="button" data-other-mob-zone="${esc(row.zone)}" data-mob-key="${esc(m.key)}">${esc(row.zone)} · Lv. ${esc(row.level)} · ${row.count} spawn records</button>`).join(''):'No other atlas area has a matching monster name.';
    }).catch(()=>{if(context===mobContext)mobModal.querySelector('#atlas-other-zones').textContent='Other-zone index unavailable. Reopen these details to retry.'});
  }
  function openMob(m,zone,button){hidePreview();returnMob=button||returnMob;mobContext={m,zone};pointLimit=40;renderMob();mobModal.hidden=false;document.body.classList.add('atlas-detail-open');mobModal.querySelector('[data-atlas-close]').focus({preventScroll:true})}
  function hover(button){
    const zone=button.dataset.mobZone,m=find(zone,button.dataset.mobKey);if(!m)return;
    hidePreview();hoverSource=button;button.setAttribute('aria-describedby',preview.id);preview.innerHTML=body(m,zone,true);preview.hidden=false;
    const rect=button.getBoundingClientRect(),width=Math.min(430,innerWidth-24),above=rect.top-20,below=innerHeight-rect.bottom-20;
    preview.style.width=width+'px';preview.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';
    preview.style.maxHeight=Math.max(80,Math.max(above,below))+'px';
    preview.style.top=(below>=preview.offsetHeight||below>=above?rect.bottom+8:Math.max(12,rect.top-preview.offsetHeight-8))+'px';
  }
  document.addEventListener('pointerover',e=>{const button=e.target.closest('.atlas-mob-name');if(button&&button!==hoverSource){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>hover(button),220)}});
  document.addEventListener('focusin',e=>{if(e.target.matches('.atlas-mob-name'))hover(e.target)});
  document.addEventListener('pointerout',e=>{if(e.target.closest('.atlas-mob-name')&&!preview.contains(e.relatedTarget)){clearTimeout(hoverTimer);hoverTimer=setTimeout(hidePreview,200)}});
  preview.addEventListener('pointerenter',()=>clearTimeout(hoverTimer));preview.addEventListener('pointerleave',hidePreview);
  document.addEventListener('focusout',e=>{if(e.target===hoverSource&&!preview.contains(e.relatedTarget))hidePreview()});
  async function openItem(id,button){
    hidePreview();returnItem=button;const request=++itemRequest;itemModal.hidden=false;document.body.classList.add('atlas-detail-open');
    const content=itemModal.querySelector('.atlas-detail-content');content.textContent='Loading item details…';itemModal.querySelector('[data-atlas-close]').focus({preventScroll:true});
    try{
      const shard=Math.floor(id/256),records=await window.CR_ZONE_DB.resource(`../../assets/data/item-sources/${shard}.json`,'items/'+index.version+'/'+shard),record=records[id];
      if(!record)throw new Error('No item record');
      const sources=await import('../assets/monster-drop-sources.js?v=20261024-drops1'),enriched=await sources.enrichRecord(record);
      if(request!==itemRequest)return;
      const item=record.item,s=record.sources,effects=item.effects||{};
      itemModal.querySelector('h2').textContent=item.name;
      content.innerHTML=`<p class="atlas-detail-kicker">${esc(item.kind)} · Item ${id}</p><h3><span class="item-icon-frame" data-item-icon="${id}" aria-hidden="true"></span> ${esc(item.name)}</h3><p>Stack ${item.stack} · Base vendor value ${Number(item.sell||0).toLocaleString()} gil</p>${item.equip?`<p>Equipment level ${item.equip.level}</p>`:''}${effects.alchemist?`<p>${esc(effects.alchemist)}</p>`:''}${effects.use?.length?`<p>${effects.use.map(e=>esc(e.effect)+(e.power?' · power '+esc(e.power):'')+(e.duration?' · '+esc(e.duration)+' sec':'')).join('<br>')}</p>`:''}${item.weapon?`<p>${esc(item.weapon.skill)} · ${item.weapon.damage} DMG · ${item.weapon.delay} delay</p>`:''}${effects.modifiers?.length?`<p>${effects.modifiers.map(mod=>`${esc(mod.name)} ${mod.value>0?'+':''}${esc(mod.value)}${mod.percent?'%':''}`).join(' · ')}</p>`:''}<p><b>Auction House:</b> ${esc(record.ah.path.join(' › '))}</p>${s.vendors.length?`<h3>NPC sources</h3>${s.vendors.map(v=>`<p>${esc(v.name)} · ${esc(v.zone)}${v.type==='exchange'?' · Trade '+esc(v.quantity)+' '+esc(v.currency):v.priceMin!=null?' · '+Number(v.priceMin).toLocaleString()+(v.priceMax!==v.priceMin?'–'+Number(v.priceMax).toLocaleString():'')+' gil (indexed)':v.price!=null?' · '+Number(v.price).toLocaleString()+' gil':''}</p>`).join('')}`:''}${sources.renderDropSection(enriched.sources)}<p><a href="../reference/index.html?item=${id}" target="_blank" rel="noopener">Full item entry in a separate tab ↗</a></p>`;
      const additional=document.createElement('section');additional.className='atlas-item-connections';
      additional.innerHTML=`${s.craftedBy.length||s.usedIn.length?`<h3>Crafting</h3><p>${s.craftedBy.length} recipes produce this item · used in ${s.usedIn.length} recipes.</p><button type="button" data-atlas-recipes="${id}" data-recipe-ids="${[...s.craftedBy,...s.usedIn].join(',')}">Show connected recipes</button><div class="atlas-connected-recipes"></div>`:''}${s.quests.length?`<h3>Recorded quest connections</h3>${s.quests.map(q=>`<p>${esc(q.quest)} · ${esc(q.area)}</p>`).join('')}`:''}${s.guideUses.length?`<h3>Guides using this item</h3>${s.guideUses.map(g=>`<p><a href="../${esc(g.path)}" target="_blank" rel="noopener">${esc(g.title)} ↗</a></p>`).join('')}`:''}`;
      content.querySelector('[data-monster-sources]').before(additional);
      sources.bindDropSection(content,enriched.sources);
    }catch{if(request===itemRequest)content.innerHTML='<p>Item details could not load.</p><button type="button" data-item-retry="'+id+'">Retry item details</button>'}
  }
  document.addEventListener('click',e=>{
    const recipes=e.target.closest('[data-atlas-recipes]');
    if(recipes){recipes.disabled=true;recipes.textContent='Loading existing recipe database…';window.CR_ZONE_DB.resource('../../assets/data/game-data.json','recipes/'+index.version).then(data=>{
      if(!recipes.isConnected)return;const ids=new Set(recipes.dataset.recipeIds.split(',').map(Number));
      const rows=data.recipes.filter(r=>ids.has(r.id));recipes.nextElementSibling.innerHTML=rows.map(r=>`<article><h4>${itemLink(r.result.id,r.result.name)} ×${r.result.qty}</h4><p>${esc(r.desynth?'Desynthesis':'Synthesis')} · ${Object.entries(r.skills).map(([name,cap])=>esc(name)+' '+cap).join(' · ')}${r.keyItem?' · Requires key item '+r.keyItem:''}</p><p>${itemLink(r.crystal.id,r.crystal.name)} · ${r.ingredients.map(i=>itemLink(i.id,i.name)+' ×'+i.qty).join(' · ')}</p>${r.hq?.length?`<p>HQ: ${r.hq.map((i,n)=>`${n+1}: ${itemLink(i.id,i.name)} ×${i.qty}`).join(' · ')}</p>`:''}</article>`).join('')||'<p>No connected recipe records are available.</p>';recipes.hidden=true;
    }).catch(()=>{recipes.disabled=false;recipes.textContent='Recipe data unavailable · retry'});return}
    const item=e.target.closest('[data-atlas-item-id],.item-link[data-item-id]');
    if(item&&(item.closest('#world-route-root,#mob-grid-overlay,#atlas-mob-detail,#atlas-mob-preview,#atlas-item-detail'))){e.preventDefault();e.stopImmediatePropagation();openItem(Number(item.dataset.atlasItemId??item.dataset.itemId),item);return}
    const retry=e.target.closest('[data-item-retry]');if(retry){openItem(Number(retry.dataset.itemRetry),retry);return}
    const other=e.target.closest('[data-other-mob-zone]');
    if(other){const context=mobContext,zone=other.dataset.otherMobZone;other.disabled=true;window.CR_ZONE_DB.loadZone(index.areas[zone].zoneId,null,zone).then(data=>{window.CR_ATLAS.merge(zone,data);if(mobModal.hidden||mobContext!==context)return;const m=find(zone,other.dataset.mobKey);if(m)openMob(m,zone,returnMob)}).catch(()=>{other.disabled=false;other.textContent='Could not load '+zone+' · click to retry'});return}
    const button=e.target.closest('[data-mob-key][data-mob-zone]');if(button){const zone=button.dataset.mobZone,m=find(zone,button.dataset.mobKey);if(m)openMob(m,zone,button);return}
    if(e.target.closest('[data-more-points]')){const top=mobModal.querySelector('.atlas-detail-content').scrollTop;pointLimit+=40;renderMob();mobModal.querySelector('.atlas-detail-content').scrollTop=top;return}
    const map=e.target.closest('[data-detail-map]');if(map)window.CR_ATLAS.openMap(map.dataset.detailMap);
  },true);
  // One topmost dialog owns Escape and Tab, including nested maps/item details.
  document.addEventListener('keydown',e=>{
    const top=[itemModal,document.querySelector('#zone-map-viewer'),mobModal,document.querySelector('#mob-grid-overlay')].find(node=>node&&!node.hidden);
    if(!top){if(e.key==='Escape')hidePreview();return}
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();top.querySelector('[data-atlas-close],#map-viewer-close,#mob-grid-close')?.click()}
    if(e.key==='Tab'){
      const items=[...top.querySelectorAll('button,a[href],input,select,[tabindex="0"]')].filter(node=>!node.disabled&&node.getClientRects().length);if(!items.length)return;
      if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}
    }
  },true);
})();
