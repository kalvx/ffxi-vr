import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{}};
for(const file of ['zone-routes-data.js','atlas-index.js'])vm.runInNewContext(read('travel/'+file),context);
const index=context.window.CR_ATLAS_INDEX;
const original=context.window.CR_WORLD_ROUTES.flatMap(g=>g.regions.flatMap(r=>r.zones));
const names=index.groups.flatMap(g=>g.regions.flatMap(r=>r.zones));
assert.equal(original.length,210);assert.equal(names.length,210);assert.equal(new Set(names).size,210);
assert.deepEqual([...names].sort(),[...original].sort(),'Existing directory must remain unchanged');
for(const name of original)assert(index.areas[name],'Original area lost: '+name);
const zones=new Map(),ids=new Set();let spawnCount=0,mobCount=0;
for(const [name,area]of Object.entries(index.areas)){
  assert(names.includes(name));
  const text=read('travel/atlas-data/'+area.file),zone=JSON.parse(text);zones.set(name,zone);
  assert.equal(crypto.createHash('sha256').update(text).digest('hex').slice(0,16),area.hash,name+' shard hash');
  assert.equal(zone.zone,name);assert.equal(zone.zoneId,area.zoneId);
  const mobs=[...zone.mobs,...zone.nms,...zone.hnms];assert.equal(mobs.length,area.mobCount);
  for(const m of mobs){
    mobCount++;spawnCount+=m.points.length;
    assert.equal(m.spawnCount,m.points.length);assert.equal(m.locationCount,new Set(m.points.filter(p=>p[4]==='Recorded point').map(p=>p.slice(1,4).join(','))).size);
    for(const point of m.points){assert(!ids.has(point[0]),'Duplicate spawn ID '+point[0]);ids.add(point[0]);assert.equal((point[0]>>12)&4095,area.zoneId);assert(point.slice(1,4).every(Number.isFinite))}
    assert(!m.shared.includes(2957),'Sacred crests invented as shared loot');
    for(const iid of m.shared){assert(index.rules[iid]);assert(m.levelMax>=index.rules[iid].minimumLevel)}
    for(const drop of m.drops){assert(Number.isInteger(drop.id)&&drop.name);for(const method of drop.methods){if(method.rate!=null)assert(method.rate>0&&method.rate<=100)}}
  }
  for(const url of area.maps.maps.filter(url=>url.startsWith('atlas-maps/')))assert(fs.existsSync(path.join(root,'travel',url)),url);
}
assert.equal(spawnCount,index.stats.spawnRecords);assert.equal(mobCount,index.stats.mobRecords);
const mobs=name=>{const z=zones.get(name);return[...z.mobs,...z.nms,...z.hnms]};
const lizard=mobs('Kuftal Tunnel').find(m=>m.name==='Sand Lizard');assert(lizard.shared.includes(1127)&&lizard.shared.includes(1126));assert(lizard.points.length>5);
const hare=mobs('West Ronfaure').find(m=>m.name==='Forest Hare');assert(hare.shared.includes(1126));assert(!hare.shared.includes(1127));
assert.equal(index.areas['Purgonorgo Isle'].zoneId,4);assert(mobs('Purgonorgo Isle').every(m=>m.points.every(p=>p[3]<0)));
assert(mobs('Bibiki Bay').every(m=>m.points.every(p=>p[3]>=0)));
assert.equal(index.groups.length,6);
const npc=(zone,name)=>zones.get(zone).npcs.find(n=>n.name===name);
assert(npc('Lower Jeuno','Vapor').activities.some(line=>line.includes('Dispatch')));
assert(npc('Mhaura','Trusty-Musky').quests.some(q=>q.url.includes('trusty-musky')));
assert(npc('Northern San d’Oria','Chaupire').wares.some(item=>item.name==='Oak Bed'));
for(const [name,zone]of zones){
  for(const n of zone.npcs){assert.equal(n.count,n.points.length);assert(n.points.every(p=>p.length===4&&p.every(Number.isFinite)));for(const item of n.wares)assert(item.id>0&&item.name)}
  for(const q of zone.stories)assert(fs.existsSync(path.resolve(root,'travel',q.url.split(/[?#]/)[0])),q.url);
  assert(index.areas[name].search.includes(name==='Kuftal Tunnel'?'sand lizard':''));
}
// Native connections supplement authored exits; transport annotations are retained.
const world={window:{CR_ATLAS_INDEX:index},document:{querySelector:()=>null}};
for(const file of ['zone-connections-data.js','map-index.js','zone-travel-data.js'])vm.runInNewContext(read('travel/'+file),world);
const prior=JSON.parse(JSON.stringify(world.window.CR_ZONE_EXITS)),priorTravel=JSON.stringify(world.window.CR_ZONE_TRAVEL);
vm.runInNewContext(read('travel/atlas-world.js'),world);
assert.equal(JSON.stringify(world.window.CR_ZONE_TRAVEL),priorTravel,'Existing travel guidance changed');
for(const [zone,connections]of Object.entries(prior))for(const connection of connections)assert(world.window.CR_ZONE_EXITS[zone].includes(connection),'Authored connection lost');
// Exercise the real loader twice in fresh page contexts with shared fake IndexedDB.
const store=new Map();let requests=0;
function loader(fail=false){
  const win={CR_ATLAS_INDEX:{areas:{Test:{name:'Test',zoneId:100,file:'100.json',hash:'v1'}}}};
  const indexedDB={open(){const request={};queueMicrotask(()=>{request.result={transaction:()=>({objectStore:()=>({get(key){const q={};queueMicrotask(()=>{q.result=store.get(key);q.onsuccess()});return q},put(value,key){store.set(key,value)}})})};request.onsuccess()});return request}};
  const c={window:win,document:{currentScript:{src:'https://example.test/travel/zone-db-loader.js'}},URL,indexedDB,AbortSignal,
    fetch:async()=>{requests++;if(fail)throw new Error('Fixture network failure');return{ok:true,json:async()=>({version:1,zone:'Test',mobs:[],npcs:[]})}}};
  vm.runInNewContext(read('travel/zone-db-loader.js'),c);return win.CR_ZONE_DB;
}
const first=loader();await Promise.all([first.loadZone(100,null,'Test'),first.loadZone(100,null,'Test')]);assert.equal(requests,1,'In-flight duplication');
await loader(true).loadZone(100,null,'Test');assert.equal(requests,1,'Persistent cache was lost on page reload');
store.clear();const failed=loader(true);await assert.rejects(failed.loadZone(100,null,'Test'));await assert.rejects(failed.loadZone(100,null,'Test'));assert.equal(requests,3,'Failed promise was not retryable');
// Expansion changes retain completed and in-flight work and limit concurrent requests.
const select={value:'alpha',addEventListener:(name,callback)=>select[name]=callback},retry={addEventListener:(name,callback)=>retry[name]=callback};
const field={},calls=[],pending=new Map(),events=[];
const win={CR_ZONE_FIELD_GUIDES:field,CR_WORLD_ROUTES:[{id:'alpha',regions:[{zones:['A','B','C']}]},{id:'beta',regions:[{zones:['D','E']}]}],
  CR_ATLAS_INDEX:{areas:Object.fromEntries(['A','B','C','D','E'].map((name,i)=>[name,{zoneId:i}]))},
  CR_ATLAS:{merge:(name)=>field[name]={dbLoaded:true},failed(){}},dispatchEvent:event=>events.push(event.detail),
  CR_ZONE_DB:{loadZone:(id,status,name)=>{calls.push(name);return new Promise((resolve,reject)=>pending.set(name,{resolve,reject}))}}};
vm.runInNewContext(read('travel/zone-atlas-autoload.js'),{window:win,document:{querySelector:s=>s==='#route-expansion'?select:retry},CustomEvent:class{constructor(name,options){this.detail=options.detail}}});
select.change();assert.deepEqual(calls,['A','B']);select.value='beta';select.change();assert.deepEqual(calls,['A','B']);
pending.get('A').resolve({});pending.get('B').resolve({});await new Promise(setImmediate);assert.deepEqual(calls,['A','B','D','E']);assert(field.A.dbLoaded&&field.B.dbLoaded);
pending.get('D').resolve({});pending.get('E').resolve({});await new Promise(setImmediate);
select.value='alpha';select.change();assert.deepEqual(calls,['A','B','D','E','C']);pending.get('C').reject(new Error('Fixture unavailable'));await new Promise(setImmediate);
assert(events.at(-1).failed===1&&events.at(-1).complete===2);retry.click();assert.equal(calls.at(-1),'C');pending.get('C').resolve({});await new Promise(setImmediate);assert(events.at(-1).done&&events.at(-1).complete===3);
console.log(`PASS: ${names.length} areas, ${mobCount} monster entries, ${spawnCount} unique spawn slots; hashes, coordinates, original coverage, Purgonorgo split, seal rules, local maps, persistent/in-flight cache, two-request queue, expansion switching and retry.`);
