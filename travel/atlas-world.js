// A schematic world directory, grounded in the retained regions and server IDs.
(function(){
  const index=window.CR_ATLAS_INDEX;if(!index)return;
  window.CR_WORLD_ROUTES=index.groups;
  const maps=window.CR_ZONE_MAPS,travel=window.CR_ZONE_TRAVEL,exits=window.CR_ZONE_EXITS;
  const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  for(const area of Object.values(index.areas)){
    if(!maps[area.name]||area.name==='Purgonorgo Isle')maps[area.name]=area.maps;
    if(!travel[area.name])travel[area.name]={region:area.region,outpost:null,crystals:[],crystalNote:'No verified crystal approach is recorded for this area.'};
    const key=Object.keys(exits).find(key=>normalize(key)===normalize(area.name))||area.name;
    const known=exits[key]||[];
    const targets=new Set(known.map(raw=>normalize(raw.split(/\s+(?=(?:Map\d+:\s*)?\[)/)[0])));
    exits[key]=[...known,...area.exits.filter(target=>index.areas[target]&&!targets.has(normalize(target)))];
  }
  const shell=document.querySelector('#atlas-world');if(!shell)return;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Region positions are schematic, never distances or travel connections.
  const places={Ronfaure:[440,255],"San d’Oria":[420,210],Zulkheim:[450,350],Norvallen:[530,265],Gustaberg:[550,445],Bastok:[545,495],Derfland:[615,365],Jeuno:[660,270],Qufim:[685,190],Aragoneu:[800,275],Sarutabaruta:[840,410],Windurst:[860,465],Kolshushu:[935,365],Fauregandi:[550,155],Valdeaunia:[530,90],Kuzotz:[390,450],Vollbow:[305,385],"Li’Telor":[900,220],"Tu’Lia":[900,100],'Elshimo Lowlands':[760,540],'Elshimo Uplands':[890,540],'Tavnazian Archipelago':[310,280],'Tavnazian Marquisate':[280,225],Movalpolos:[620,445],'West Aht Urhgan':[1105,280],'Mamool Ja Savagelands':[1110,385],'Halvung Territory':[1125,155],'Arrapago Islands':[1210,220],'Ruins of Alzadaal':[1220,400],'Adoulin Islands':[215,365],'East Ulbuka Territory':[125,270],'East Ulbuka':[125,270]};
  function regionPoint(name){
    if(places[name])return places[name];
    const base=name.replace(/^The /,'').replace(/ Front$/,'');if(places[base])return places[base];return null;
  }
  function selectRegion(name){
    const select=document.querySelector('#route-expansion');
    if(!select.value){const area=Object.values(index.areas).find(area=>area.region===name);if(area){select.value=area.expansion;select.dispatchEvent(new Event('change',{bubbles:true}))}}
    document.querySelector('#route-search').value=name;document.querySelector('#route-search').dispatchEvent(new Event('input',{bubbles:true}));
    paint();document.querySelector('#world-route-root')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function paint(){
    const expansion=document.querySelector('#route-expansion')?.value;
    const selected=Object.values(index.areas).filter(area=>!expansion||expansion==='all'||area.expansion===expansion);
    const counts=new Map();for(const area of selected)counts.set(area.region,(counts.get(area.region)||0)+1);
    if(!expansion||expansion==='all')for(const name of counts.keys())if(name.endsWith(' Front'))counts.delete(name);
    let extra=0;
    const nodes=[...counts].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,count])=>{
      const point=regionPoint(name)||[105+(extra%7)*180,635+Math.floor(extra++/7)*62];
      return `<g role="button" tabindex="0" data-world-region="${esc(name)}" aria-label="${esc(name)}, ${count} ${count===1?'area':'areas'}" transform="translate(${point[0]},${point[1]})"><circle r="7"/><text y="-14" text-anchor="middle">${esc(name)}</text><text class="world-count" y="22" text-anchor="middle">${count} ${count===1?'area':'areas'}</text></g>`;
    }).join('');
    const height=Math.max(600,700+Math.floor((extra-1)/7)*62);
    shell.querySelector('#atlas-world-map').innerHTML=`<svg viewBox="0 0 1320 ${height}" role="group" aria-label="Schematic world regions"><path class="world-land" d="M80 140 180 95 265 180 240 295 280 410 180 455 85 365 45 245Z M465 55 590 80 625 160 700 245 655 380 590 520 480 505 415 390 365 285 415 170Z M800 165 920 155 1020 280 1000 420 910 495 800 450 745 345 765 245Z M1090 90 1245 85 1290 210 1270 390 1155 455 1060 350 1095 240Z M270 230 330 265 320 315 265 310Z M745 515 825 495 910 525 925 565 790 580Z"/><text class="world-continent" x="155" y="170">ULBUKA</text><text class="world-continent" x="505" y="325">QUON</text><text class="world-continent" x="850" y="330">MINDARTIA</text><text class="world-continent" x="1160" y="330">ARADJIAH</text>${extra?'<path class="world-realm-line" d="M30 590H1290"/><text class="world-realm-label" x="30" y="615">OTHER REALMS & BATTLEFIELDS</text>':''}${nodes}</svg>`;
    shell.querySelector('#atlas-region-buttons').innerHTML=[...counts].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,count])=>`<button type="button" data-world-region="${esc(name)}">${esc(name)} <span>${count}</span></button>`).join('');
    shell.querySelector('#atlas-world-count').textContent=expansion?`${selected.length} areas · ${counts.size} regions · ${index.stats.areas} areas in the atlas`:`${index.stats.areas} atlas areas · choose an expansion for era-specific regions`;
    const worldSelect=shell.querySelector('#atlas-world-expansion'),select=document.querySelector('#route-expansion');
    if(worldSelect){worldSelect.innerHTML=select.innerHTML;worldSelect.value=select.value}
  }
  shell.addEventListener('click',e=>{const region=e.target.closest('[data-world-region]');if(region)selectRegion(region.dataset.worldRegion)});
  shell.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const region=e.target.closest('g[data-world-region]');if(region){e.preventDefault();selectRegion(region.dataset.worldRegion)}});
  shell.querySelector('#atlas-world-expansion')?.addEventListener('change',e=>{const select=document.querySelector('#route-expansion');document.querySelector('#route-search').value='';select.value=e.target.value;select.dispatchEvent(new Event('change',{bubbles:true}))});
  document.querySelector('#route-expansion')?.addEventListener('change',paint);
  document.addEventListener('DOMContentLoaded',paint,{once:true});
})();
