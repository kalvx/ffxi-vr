import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const moduleText = read('assets/monster-drop-sources.js').replaceAll('import.meta.url', JSON.stringify('https://example.test/assets/monster-drop-sources.js'));
const api = await import(`data:text/javascript;base64,${Buffer.from(moduleText).toString('base64')}`);
const record = id => JSON.parse(read(`assets/data/item-sources/${Math.floor(id/256)}.json`))[id];
const monsters = JSON.parse(read('assets/data/shared-monster-drops.json')).monsters;

const seal = record(1127);
assert.equal(seal.sources.dropRules[0].minimumLevel, 50);
let candidates = api.candidateRows(seal.sources, monsters);
assert(candidates.length > 1000);
assert(candidates.every(row => row.source !== 'shared' || row.levelMin >= 50));
assert(api.filterRows(candidates, 'kuftal sand lizard').some(row => row.monster === 'Sand Lizard' && row.zone === 'Kuftal Tunnel'));
assert(!api.filterRows(candidates, 'Kettenkaefer').some(row => row.zone === 'Kuftal Tunnel'));
assert(!candidates.some(row => row.zone.startsWith('Dynamis')));
assert.equal(record(2955).sources.dropRules[0].minimumLevel, 70);
assert.equal(record(2956).sources.dropRules[0].minimumLevel, 75);
assert(!record(2957).sources.dropRules, 'Sacred crests are not in this shared rule');
assert.equal(record(3520).sources.dropRules[0].minimumLevel, 80);
assert.equal(record(3297).sources.dropRules[0].minimumLevel, 50);
for (let i=0;i<8;i++) {
  const sources = record(4096+i).sources;
  assert(api.candidateRows(sources, monsters).filter(row => row.source === 'shared').every(row => row.element === i+1));
}

const mock = [
  {monster:'Low Mob', zone:'Test', levelMin:40, levelMax:49, element:1},
  {monster:'Boundary Mob', zone:'Test', levelMin:49, levelMax:50, element:1},
  {monster:'High Mob', zone:'Test', levelMin:80, levelMax:81, element:2},
];
assert.deepEqual(api.candidateRows({dropRules:[{kind:'seal',minimumLevel:50}]},mock).map(row=>[row.monster,row.levelMin]),[['Boundary Mob',50],['High Mob',80]]);
assert.equal(api.candidateRows({dropRules:[{kind:'crystal',minimumLevel:1,element:2}]},mock).length,1);
assert(!api.rowMarkup({monster:'<Mob>',zone:'&Zone',levelMin:1,levelMax:1,note:'Conditional'}).includes('undefined%'));
assert(api.rowMarkup({monster:'<Mob>',zone:'&Zone',levelMin:1,levelMax:1}).includes('&lt;Mob&gt;'));

globalThis.fetch = async () => ({ok:true,json:async()=>({monsters})});
const enriched = await api.enrichRecord(seal);
assert(enriched.sources.monsterRows.length > 1000);
assert(!seal.sources.monsterRows,'Cached source record must not be mutated');
const html = api.renderDropSection(enriched.sources);
assert(html.includes('five-minute seal cooldown'));
assert(html.includes('Search monsters or zones'));
assert.equal((html.match(/<article>/g)||[]).length,40);
const fields = Object.fromEntries(['search','more','rows','count'].map(key=>[key,{value:'',events:{},addEventListener(event,cb){this.events[event]=cb;}}]));
const section = {querySelector(selector){return fields[selector.match(/data-monster-(\w+)/)[1]];}};
api.bindDropSection({querySelector:()=>section},enriched.sources);
assert.equal((fields.rows.innerHTML.match(/<article>/g)||[]).length,40);
fields.more.events.click();
assert.equal((fields.rows.innerHTML.match(/<article>/g)||[]).length,80);
fields.search.value='Kuftal Sand Lizard';fields.search.events.input();
assert(fields.rows.innerHTML.includes('Sand Lizard'));
assert(fields.more.hidden);
fields.search.value='no such monster 987654';fields.search.events.input();
assert(fields.rows.innerHTML.includes('No monsters match'));
assert(fields.count.textContent.includes('0 of 0'));
for (const id of [14676,14782]) assert(record(id).sources.drops.some(row=>row.monster==='Padfoot' && row.note.includes('Real Padfoot')));
assert(record(1909).sources.drops.some(row=>row.monster==='Gunpod'));
assert(record(2147).sources.drops.some(row=>row.source==='script' && row.note.includes('broken tusk')));
assert(!record(2154).sources.drops.some(row=>row.monster==='Angler Orobon' && row.zone==='Talacca Cove'), 'Permanent NO_DROPS also disables loot listeners');
assert(record(5365).sources.drops.some(row=>row.monster==='Vile Wahzil' && row.note.includes('Socket')));
console.log(`PASS: shared-drop boundaries, crystals by element, actual Kindred seal sources, script loot, HTML escaping, search and 40/80-row pagination (${candidates.length} Kindred seal candidates).`);
