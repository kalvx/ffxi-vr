// Current Reality per-zone field-guide loader.
// Loads the actual LandSandBoat YAML for one zone at a time instead of downloading the huge global SQL tables.
(function(){
  const ROOT='https://raw.githubusercontent.com/LandSandBoat/server/base/data/zones/';
  const hnmNames=new Set(['Absolute Virtue','Adamantoise','Aspidochelone','Behemoth','King Behemoth','Fafnir','Nidhogg','Roc','Simurgh','Serket','King Arthro','Capricious Cassie','Lord of Onzozo','Charybdis','Tiamat','Jormungand','Vrtra','Khimaira','Cerberus','Hydra','Sandworm','Dark Ixion']);
  const clean=s=>String(s||'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
  const title=s=>clean(s).replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bOf\b/g,'of').replace(/\bThe\b/g,'The');
  const cache=new Map();

  function slugCandidates(zone){
    let s=String(zone||'').normalize('NFKD').replace(/[’‘']/g,'').replace(/\[s\]/ig,' s ').replace(/\(s\)/ig,' s ').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase();
    const a=[s,s.replace(/^the_/,''),s.replace(/_the_/g,'_'),s.replace(/ru_lude/,'rulude'),s.replace(/pso_xja/,'psoxja'),s.replace(/qu_bia/,'qubia'),s.replace(/zi_tah/,'zitah'),s.replace(/hu_xzoi/,'huxzoi'),s.replace(/ru_hmet/,'ruhmet')];
    return [...new Set(a.filter(Boolean))];
  }
  async function getText(url){
    const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error('HTTP '+r.status);return r.text();
  }
  async function fetchZoneFile(zone,file){
    let last=null;
    for(const slug of slugCandidates(zone)){
      try{return {slug,text:await getText(`${ROOT}${slug}/${file}`)}}catch(e){last=e}
    }
    throw last||new Error('zone file not found');
  }
  function blocks(text,section,headerRe){
    const start=text.indexOf(section+'\n');if(start<0)return[];const part=text.slice(start+section.length+1);const end=part.search(/^\S/m);const body=end>=0?part.slice(0,end):part;const hits=[];let m;
    headerRe.lastIndex=0;while((m=headerRe.exec(body)))hits.push({name:m[1],at:m.index,after:headerRe.lastIndex});
    return hits.map((h,i)=>({name:h.name,body:body.slice(h.after,i+1<hits.length?hits[i+1].at:body.length)}));
  }
  function listItems(block){
    const out=[];for(const m of block.matchAll(/^\s+item:\s+([^#\n]+)/gm))out.push(title(m[1]));
    for(const m of block.matchAll(/^\s{12,}([a-zA-Z0-9_'-]+):\s*\d+\s*$/gm)){const k=m[1];if(!['chance','rate','weight'].includes(k))out.push(title(k))}
    return [...new Set(out)].slice(0,20);
  }
  function templateData(text){
    const map=new Map();
    for(const b of blocks(text,'templates:',/^  ([^\n:]+):\s*$/gm)){
      const display=(b.body.match(/^\s+display_name:\s+([^#\n]+)/m)||[])[1]||b.name;
      map.set(b.name,{name:title(display),nm:/^\s+type:\s*\[[^\]]*notorious/i.test(b.body),aggressive:/^\s+aggressive:\s*true/m.test(b.body),trueDetection:/^\s+true_detection:\s*true/m.test(b.body),links:/^\s+links:\s*true/m.test(b.body),respawn:Number((b.body.match(/^\s+respawn:\s*(\d+)/m)||[])[1]||0),drops:listItems(b.body)});
    }
    return map;
  }
  function regionCenters(text){
    const map=new Map();
    for(const b of blocks(text,'regions:',/^  ([^\n:]+):\s*$/gm)){
      const pts=[...b.body.matchAll(/\[\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[3])]);
      if(!pts.length)continue;const x=pts.reduce((s,p)=>s+p[0],0)/pts.length,z=pts.reduce((s,p)=>s+p[1],0)/pts.length;map.set(b.name,[x,z]);
    }
    return map;
  }
  function spawnData(text,templates,regions){
    const merged=new Map();
    for(const b of blocks(text,'spawns:',/^  (\d+):\s*$/gm)){
      const tkey=(b.body.match(/^\s+template:\s+([^#\n]+)/m)||[])[1]?.trim();if(!tkey||!templates.has(tkey))continue;
      const t=templates.get(tkey),lev=b.body.match(/^\s+level:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/m),at=b.body.match(/^\s+at:\s*\[\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/m),reg=(b.body.match(/^\s+region:\s+([^#\n]+)/m)||[])[1]?.trim();
      let pos='';if(at)pos=`X ${Math.round(Number(at[1]))}, Z ${Math.round(Number(at[3]))}`;else if(reg&&regions.has(reg)){const p=regions.get(reg);pos=`${reg} area — approx. X ${Math.round(p[0])}, Z ${Math.round(p[1])}`}
      const k=tkey,cur=merged.get(k)||{...t,min:999,max:0,count:0,positions:[]};cur.count++;if(lev){cur.min=Math.min(cur.min,Number(lev[1]));cur.max=Math.max(cur.max,Number(lev[2]))}if(pos&&!cur.positions.includes(pos)&&cur.positions.length<5)cur.positions.push(pos);merged.set(k,cur);
    }
    return [...merged.values()];
  }
  function detection(m){const a=[];if(m.aggressive)a.push('Aggressive');if(m.trueDetection)a.push('True detection');if(m.links)a.push('Links');return a.join(' • ')||'Normally non-aggressive / special'}
  function mobRow(m){const level=m.max?(m.min===m.max?String(m.max):`${m.min}-${m.max}`):'';return {name:m.name,level,detect:detection(m),pos:m.positions[0]||'',spawn:[m.count>1?`${m.count} spawn records`:'',m.respawn?`Respawn ${Math.round(m.respawn/60)}m`:''].filter(Boolean).join(' • '),drops:m.drops,nm:m.nm,hnm:hnmNames.has(m.name),note:m.positions.length>1?`Other locations: ${m.positions.slice(1).join(' • ')}`:''}}
  function npcService(name){const s=name.toLowerCase();if(s.includes('home point'))return'Home Point';if(s.includes('survival guide'))return'Survival Guide';if(s.includes('unity'))return'Unity';if(s.includes('waypoint'))return'Waypoint';if(s.includes('moogle'))return'Moogle service';if(s.includes('chocobo'))return'Chocobo service';if(s.includes('auction'))return'Auction House';return''}
  function npcData(text){
    const out=new Map();for(const b of blocks(text,'npcs:',/^  (\d+):\s*$/gm)){
      if(/^\s+status:\s*cutscene_only/m.test(b.body))continue;const raw=(b.body.match(/^\s+display_name:\s+([^#\n]+)/m)||[])[1]||(b.body.match(/^\s+script:\s+([^#\n]+)/m)||[])[1];if(!raw)continue;const name=title(raw);if(/^NPC\[/i.test(name)||/^(Treasure Casket|Treasure Coffer|Door|Blank)$/i.test(name))continue;
      const at=b.body.match(/^\s+at:\s*\[\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/m);const pos=at?`X ${Math.round(Number(at[1]))}, Z ${Math.round(Number(at[3]))}`:'';const k=name.toLowerCase(),cur=out.get(k)||{name,pos,service:npcService(name),note:'',count:0};cur.count++;if(!cur.pos&&pos)cur.pos=pos;out.set(k,cur)
    }
    return [...out.values()].map(n=>{if(n.count>1)n.note=`${n.count} entries in zone data`;delete n.count;return n}).sort((a,b)=>a.name.localeCompare(b.name));
  }
  async function loadZone(zoneId,onStatus,zoneName){
    const status=typeof onStatus==='function'?onStatus:()=>{},zone=zoneName||Object.keys(window.CR_ZONE_MAPS||{}).find(k=>Number(window.CR_ZONE_MAPS[k].zoneId)===Number(zoneId));if(!zone)throw new Error('No zone name for '+zoneId);if(cache.has(zone))return cache.get(zone);
    status('Loading actual mobs, NPCs, NMs, HNMs and coordinates for '+zone+'…');
    const mobFile=await fetchZoneFile(zone,'mobs.yaml');let npcText='',regionText='';
    try{npcText=(await fetchZoneFile(zone,'npcs.yaml')).text}catch(e){}
    try{regionText=(await fetchZoneFile(zone,'regions.yaml')).text}catch(e){}
    const templates=templateData(mobFile.text),regions=regionCenters(regionText),all=spawnData(mobFile.text,templates,regions).map(mobRow),mobs=all.filter(m=>!m.nm&&!m.hnm),nms=all.filter(m=>m.nm&&!m.hnm),hnms=all.filter(m=>m.hnm),npcs=npcData(npcText);
    const result={mobs,nms,hnms,npcs,sourceNote:'Actual per-zone LandSandBoat YAML: mob names, level ranges, NM flags, loot, spawn records/coordinates and NPC coordinates. Region-based spawns show the approximate center of the server spawn region.'};cache.set(zone,result);status(`Loaded ${mobs.length} mobs, ${nms.length} NMs, ${hnms.length} HNMs and ${npcs.length} NPCs.`);return result;
  }
  window.CR_ZONE_DB={loadZone};
})();
