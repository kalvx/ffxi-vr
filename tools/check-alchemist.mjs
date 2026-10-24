import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const json=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const data=json('assets/data/game-data.json');
assert.deepEqual(data.jobs.find(j=>j.id===18),{id:18,code:'ALC',name:'Alchemist'});
assert.equal(data.abilities.filter(a=>a.job==='ALC').length,20);
assert.equal(new Set(data.abilities.filter(a=>a.job==='ALC').map(a=>a.recastGroup)).size,20);
for(const id of [136,137])assert.equal(data.abilities.find(a=>a.id===id).recast,15);
for(const id of [140,147])assert.equal(data.abilities.find(a=>a.id===id).recast,30);
const curse=data.spells.find(s=>s.id===257);
assert.deepEqual(curse.jobs,{ALC:25});assert.equal(curse.mp,0);
for(const [id,level,name] of [[256,10,'Virus'],[1000,37,'Float'],[1001,40,'Mana Shield'],[1020,50,'Mix: Impact'],[1021,60,'Mix: Meteor'],[1022,72,'Mix: Meteor II']]){
 const spell=data.spells.find(s=>s.id===id);
 assert.equal(spell.name,name);assert.deepEqual(spell.jobs,{ALC:level});
 assert.equal(spell.mp,id===1021?25:id===1022?35:0);assert.equal(spell.prepared,true);
 assert.equal(spell.macroTarget,[1000,1001].includes(id)?'me':'t');
}
const customItems=json('assets/data/item-sources/89.json');
for(const [id,level,seals] of [[23030,20,5],[23031,30,10],[23032,40,20],[23033,60,40]]){
 const record=customItems[id];assert.equal(record.item.equip.level,level);
 assert.equal(record.item.equip.jobs,131072);assert.equal(record.ah.listed,false);
 assert.equal(record.sources.vendors[0].name,'Aldric Basin');
 assert.equal(record.sources.vendors[0].quantity,seals);assert.equal(record.sources.vendors[0].type,'exchange');
}
for(const [id,value] of [[23031,4],[23032,8]]){assert.equal(customItems[id].item.effects.modifiers[0].value,value);assert.equal(data.items.find(i=>i.id===id).effects.modifiers[0].value,value);}
for(const [id,level,effect] of [[23034,50,'Stun'],[23035,55,'Defense down']]){
 const record=customItems[id];assert.equal(record.item.equip.level,level);
 assert.equal(record.item.stack,99);assert.equal(record.item.equip.jobs,131072);
 assert.equal(record.ah.id,15);assert.equal(record.ah.listed,true);
 assert.ok(record.item.effects.alchemist.includes(effect));
}
const unlockContext={};vm.runInNewContext(fs.readFileSync(path.join(root,'quests/job-unlocks-data.js'),'utf8')+';globalThis.unlock=JOB_UNLOCKS.alchemist;',unlockContext);
assert.equal(unlockContext.unlock.quest,'A Remedy Without a Name');
assert.equal(unlockContext.unlock.src,'../jobs/alchemist/index.html');
assert.ok(unlockContext.unlock.steps.some(s=>s.includes('five ordinary Potions')));
assert.ok(unlockContext.unlock.steps.some(s=>s.includes('five ordinary Ethers')));
assert.ok(json('npcs/quest-index.json').some(n=>n.name==='Aldric Basin'));
for(const page of ['index','mixtures','magic','equipment']){
 const source=fs.readFileSync(path.join(root,`jobs/alchemist/${page}.html`),'utf8');
 assert.ok(source.includes('../../assets/wiki.css'));
 assert.ok(source.includes('job-unlock.html?job=alchemist'));
}
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
console.log('PASS: 22 armor guides, 20 Alchemist abilities, seven prepared spells, 100 gear records, four gun trades, two effect bullets, NPC directory, unlock quest and four separate job guides.');
