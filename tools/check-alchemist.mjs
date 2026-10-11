import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const json=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const data=json('assets/data/game-data.json');
assert.deepEqual(data.jobs.find(j=>j.id===18),{id:18,code:'ALC',name:'Alchemist'});
assert.equal(data.abilities.filter(a=>a.job==='ALC').length,20);
const curse=data.spells.find(s=>s.id===257);
assert.deepEqual(curse.jobs,{ALC:25});assert.equal(curse.mp,0);
const context={window:{}};
for(const file of ['armor-data.js','af1-data.js','alchemist-data.js','alchemist-guide.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'jobs/armor',file),'utf8'),context);
const catalog=context.window.CR_ALCHEMIST_ARMOR.items;
assert.equal(catalog.length,100);assert.equal(new Set(catalog.map(x=>x.rank)).size,20);
const icons=json('assets/item-icons/index.json');
for(const x of catalog){
 const item=data.items.find(i=>i.id===x.id);
 assert.equal(item.name,x.name);assert.equal(item.equip.jobs,131072);assert.equal(item.equip.slot,x.slotmask);
 assert.equal(item.equip.level,x.level);assert.equal(item.alchemist.shopPrice,x.price);
 const record=json(`assets/data/item-sources/${Math.floor(x.id/256)}.json`)[x.id];
 assert.equal(record.sources.vendors[0].name,'Edrien Rikku');assert.equal(record.sources.vendors[0].price,x.price);
 assert.equal(record.item.effects.alchemist,x.help);assert.equal(record.sources.quests.length,0);
 assert.ok(icons.items[x.id]);
 assert.ok(!record.item.effects.modifiers.some(m=>/automaton|maneuver|repair|overload/i.test(m.name)));
}
const js=fs.readFileSync(path.join(root,'jobs/armor/armor-guide.js'),'utf8');
for(const job of context.window.JOB_ARMOR_DATA){
 const guide={dataset:{armorGuide:job.slug},innerHTML:'',querySelectorAll:()=>[]};
 const c={window:context.window,document:{createElement:()=>({}),head:{append:()=>{}},querySelector:()=>guide},localStorage:{getItem:()=>null}};
 vm.runInNewContext(js,c);
 assert.ok(guide.innerHTML.includes(job.name),job.slug);
 if(job.slug==='alc'){assert.ok(guide.innerHTML.includes('96,000,000 gil'));assert.ok(!guide.innerHTML.includes('Rem’s Tale'));}
 else assert.ok(guide.innerHTML.includes('required quest order'),job.slug);
}
console.log('PASS: 22 job guides, 20 Alchemist abilities, Curse, 100 priced gear records, shop sources and icons.');
