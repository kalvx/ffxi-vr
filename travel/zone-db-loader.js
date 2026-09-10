// Lazy LandSandBoat zone database reader for the Current Reality World Route Finder.
// This intentionally loads only when a visitor asks for the full zone database.
(function(){
  const ROOT='https://raw.githubusercontent.com/LandSandBoat/server/base/sql/';
  const urls={
    spawns:ROOT+'mob_spawn_points.sql',
    groups:ROOT+'mob_groups.sql',
    pools:ROOT+'mob_pools.sql',
    drops:ROOT+'mob_droplist.sql',
    npcs:ROOT+'npc_list.sql'
  };
  const state={promise:null,db:null};
  const hnmNames=new Set([
    'Absolute Virtue','Adamantoise','Aspidochelone','Behemoth','King Behemoth','Fafnir','Nidhogg',
    'Roc','Simurgh','Serket','King Arthro','Capricious Cassie','Lord of Onzozo','Charybdis',
    'Tiamat','Jormungand','Vrtra','Khimaira','Cerberus','Hydra','Sandworm','Dark Ixion',
    'Lambton Worm','Kukulkan','Briareus','Glavoid','Sobek','Apademak','Alfard','Orthrus',
    'Isgebind','Amphitrite','Hadhayosh','Dragua','Pantokrator','Rani','Shinryu'
  ]);
  const clean=s=>String(s??'').replace(/^['"]|['"]$/g,'').replace(/\\'/g,"'").replace(/_/g,' ').trim();
  function csv(s){
    const out=[];let cur='',q=false;
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==="'"&&s[i-1]!=='\\'){q=!q;cur+=c;continue}
      if(c===','&&!q){out.push(cur.trim());cur='';continue}
      cur+=c;
    }
    out.push(cur.trim());return out;
  }
  function insertRows(text,table,fn){
    const re=new RegExp('INSERT INTO `'+table.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'` VALUES \\((.*?)\\);(?:\\s*--\\s*(.*))?$','gm');
    let m;while((m=re.exec(text)))fn(csv(m[1]),m[2]||'');
  }
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const zoneFromEntity=id=>Math.floor((num(id)-0x01000000)/0x1000);
  function detection(pool){
    if(!pool)return'';const bits=[];
    if(pool.aggro)bits.push('Aggressive');
    if(pool.trueDetection)bits.push('True detection');
    if(pool.links)bits.push('Links');
    return bits.join(' • ')||'Normally non-aggressive / special';
  }
  function dropLabel(comment,itemId,itemRate){
    let label=String(comment||'').trim();
    if(label){
      label=label.replace(/\s*\([^)]*\)\s*$/,'').trim();
      if(label)return label;
    }
    const rate=String(itemRate||'').replace(/^@/,'');
    return `Item ${itemId}${rate?` (${rate})`:''}`;
  }
  async function fetchText(url){
    const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(`Database source returned ${r.status}`);return r.text();
  }
  async function build(){
    const [spawnText,groupText,poolText,npcText]=await Promise.all([fetchText(urls.spawns),fetchText(urls.groups),fetchText(urls.pools),fetchText(urls.npcs)]);
    const pools=new Map(),groupsByZone=new Map(),spawnsByZone=new Map(),npcsByZone=new Map();
    insertRows(poolText,'mob_pools',(v)=>{
      const poolid=num(v[0]);if(!poolid)return;
      pools.set(poolid,{name:clean(v[2]||v[1]),aggro:num(v[11])!==0,trueDetection:num(v[12])!==0,links:num(v[13])!==0,mobType:num(v[14])});
    });
    insertRows(groupText,'mob_groups',(v)=>{
      const zoneid=num(v[2]),groupid=num(v[0]);if(!groupsByZone.has(zoneid))groupsByZone.set(zoneid,new Map());
      groupsByZone.get(zoneid).set(groupid,{groupid,poolid:num(v[1]),name:clean(v[3]),respawn:num(v[4]),dropid:num(v[6])});
    });
    insertRows(spawnText,'mob_spawn_points',(v)=>{
      const zoneid=zoneFromEntity(v[0]);if(zoneid<0||zoneid>999)return;
      const row={mobid:num(v[0]),name:clean(v[3]||v[2]),groupid:num(v[4]),min:num(v[5]),max:num(v[6]),x:num(v[7]),y:num(v[8]),z:num(v[9]),spawnHour:v[11]==='NULL'?null:num(v[11]),despawnHour:v[12]==='NULL'?null:num(v[12])};
      if(!spawnsByZone.has(zoneid))spawnsByZone.set(zoneid,[]);spawnsByZone.get(zoneid).push(row);
    });
    insertRows(npcText,'npc_list',(v)=>{
      const zoneid=zoneFromEntity(v[0]);if(zoneid<0||zoneid>999)return;
      const name=clean(v[2]||v[1]);if(!name)return;
      const row={name,x:num(v[4]),y:num(v[5]),z:num(v[6]),flag:num(v[7]),status:num(v[13]),widescan:num(v[18])};
      if(!npcsByZone.has(zoneid))npcsByZone.set(zoneid,[]);npcsByZone.get(zoneid).push(row);
    });
    return {pools,groupsByZone,spawnsByZone,npcsByZone,drops:null};
  }
  async function ensureDrops(db){
    if(db.drops)return db.drops;const text=await fetchText(urls.drops),drops=new Map();
    insertRows(text,'mob_droplist',(v,comment)=>{
      const id=num(v[0]);if(!id)return;const row={type:num(v[1]),itemId:num(v[4]),rate:v[5],label:dropLabel(comment,v[4],v[5])};
      if(!drops.has(id))drops.set(id,[]);drops.get(id).push(row);
    });db.drops=drops;return drops;
  }
  function usefulNpc(n){
    const s=n.name.toLowerCase();
    if(!s||s==='npc'||/^door($| )/.test(s)||/^blank$/.test(s)||/^none$/.test(s))return false;
    return true;
  }
  function npcService(name){
    const s=name.toLowerCase();
    if(/home point/.test(s))return'Home Point';if(/survival guide/.test(s))return'Survival Guide';if(/unity/.test(s))return'Unity travel';if(/waypoint/.test(s))return'Waypoint';if(/outpost/.test(s))return'Outpost / regional travel';if(/nomad moogle|moogle/.test(s))return'Moogle service';if(/auction/.test(s))return'Auction House';if(/chocobo/.test(s))return'Chocobo service';if(/shop|merchant|vendor/.test(s))return'Vendor';return'';
  }
  function worldPos(x,z){if(!x&&!z)return'';return `World X ${Math.round(x)} / Z ${Math.round(z)}`}
  async function loadZone(zoneId,onStatus){
    const status=typeof onStatus==='function'?onStatus:()=>{};
    status('Loading LandSandBoat mob and NPC tables…');
    if(!state.promise)state.promise=build().then(db=>(state.db=db,db)).catch(e=>{state.promise=null;throw e});
    const db=await state.promise,groups=db.groupsByZone.get(Number(zoneId))||new Map(),spawns=db.spawnsByZone.get(Number(zoneId))||[];
    status('Matching mobs, levels, NM flags and drop tables…');
    const neededDrops=new Set();groups.forEach(g=>{if(g.dropid)neededDrops.add(g.dropid)});
    if(neededDrops.size)await ensureDrops(db);
    const merged=new Map();
    for(const s of spawns){
      const g=groups.get(s.groupid),p=g?db.pools.get(g.poolid):null,key=`${s.groupid}:${s.name}`,existing=merged.get(key)||{name:s.name,min:s.min,max:s.max,count:0,group:g,pool:p,positions:[]};
      existing.min=Math.min(existing.min||s.min,s.min||existing.min);existing.max=Math.max(existing.max||s.max,s.max||existing.max);existing.count++;if(existing.positions.length<3&&Number.isFinite(s.x)&&Number.isFinite(s.z))existing.positions.push(worldPos(s.x,s.z));merged.set(key,existing);
    }
    const mobs=[],nms=[],hnms=[];
    for(const m of merged.values()){
      const isNm=!!(m.pool&&(m.pool.mobType&0x02)),isHnm=hnmNames.has(m.name),drops=m.group&&m.group.dropid&&db.drops?((db.drops.get(m.group.dropid)||[]).filter(d=>d.type===0).map(d=>d.label)):[];
      const level=m.min||m.max?(m.min===m.max?String(m.min):`${m.min}-${m.max}`):'';
      const spawn=[];if(m.count>1)spawn.push(`${m.count} spawn points`);if(m.group?.respawn)spawn.push(`Respawn ${Math.round(m.group.respawn/60)}m`);
      const row={name:m.name,level,detect:detection(m.pool),pos:m.positions[0]||'',spawn:spawn.join(' • '),drops:[...new Set(drops)].slice(0,18),nm:isNm,hnm:isHnm,note:m.positions.length>1?`Additional spawns: ${m.positions.slice(1).join(' • ')}`:''};
      (isHnm?hnms:isNm?nms:mobs).push(row);
    }
    const npcMerged=new Map();
    for(const n of (db.npcsByZone.get(Number(zoneId))||[]).filter(usefulNpc)){
      const key=n.name.toLowerCase(),cur=npcMerged.get(key);if(cur){cur.count++;continue}
      npcMerged.set(key,{name:n.name,pos:worldPos(n.x,n.z),service:npcService(n.name),note:'' ,count:1});
    }
    const npcs=[...npcMerged.values()].map(n=>{if(n.count>1)n.note=`${n.count} entries in zone database`;delete n.count;return n}).sort((a,b)=>a.name.localeCompare(b.name));
    mobs.sort((a,b)=>(Number.parseInt(a.level)||0)-(Number.parseInt(b.level)||0)||a.name.localeCompare(b.name));nms.sort((a,b)=>a.name.localeCompare(b.name));hnms.sort((a,b)=>a.name.localeCompare(b.name));
    status(`Loaded ${mobs.length+nms.length+hnms.length} mob groups and ${npcs.length} NPC names.`);
    return {mobs,nms,hnms,npcs,sourceNote:'Live reference loaded from LandSandBoat base SQL. Levels, NM flags, spawn records and drop lists reflect that upstream reference; Current Reality custom database changes can differ.'};
  }
  window.CR_ZONE_DB={loadZone};
})();