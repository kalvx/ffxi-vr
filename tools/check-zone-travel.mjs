import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const elements=new Map();
function element(id){
  if(!elements.has(id))elements.set(id,{value:'all',innerHTML:'',style:{},hidden:true,dataset:{},events:{},
    addEventListener(name,callback){this.events[name]=callback},querySelector:()=>null,querySelectorAll:()=>[],focus(){}});
  return elements.get(id);
}
const document={querySelector:element,querySelectorAll:()=>[],addEventListener(){},body:{classList:{add(){},remove(){}}}};
const c={window:{},document,CSS:{escape:x=>x},Image:class{},console};
element('#route-search').value='';
for(const file of ['zone-routes-data.js','zone-connections-data.js','zone-field-guides-data.js','map-index.js','zone-travel-data.js'])
  vm.runInNewContext(read('travel/'+file),c);
const original=c.window.CR_WORLD_ROUTES.flatMap(group=>group.regions.flatMap(region=>region.zones));
assert.equal(original.length,210);
assert.equal(Object.keys(c.window.CR_ZONE_TRAVEL).length,210);
for(const zone of original){
  const t=c.window.CR_ZONE_TRAVEL[zone];assert.ok(t?.region,zone);
  assert.ok(t.crystals.length||t.crystalNote,zone+' has no crystal guidance');
  for(const crystal of t.crystals){assert.ok(c.window.CR_ZONE_MAPS[crystal.zone]);assert.ok(crystal.hops>=0)}
}
const t=c.window.CR_ZONE_TRAVEL;
assert.equal(t['Konschtat Highlands'].region,'Zulkheim');
assert.equal(t['Konschtat Highlands'].outpost.zone,'Valkurm Dunes');
assert.equal(t['Konschtat Highlands'].crystals[0].name,'Dem');
assert.equal(t['Kuftal Tunnel'].region,'Vollbow');
assert.equal(t['Kuftal Tunnel'].crystals[0].name,'Altep');
assert.equal(t['Yhoator Jungle'].region,'Elshimo Uplands');
assert.equal(t['Wajaom Woodlands'].region,'Mamool Ja Savagelands');
assert.equal(t['Purgonorgo Isle'].region,'Kolshushu');
assert.equal(t['Outer Ra’Kaznar'].region,'Ra’Kaznar');
for(const zone of ['La Theine Plateau','Konschtat Highlands','Tahrongi Canyon','Eastern Altepa Desert','Yhoator Jungle','Xarcabard'])
  assert.equal(t[zone].crystals[0].hops,0,'Local crystal must win: '+zone);
for(const group of c.window.CR_WORLD_ROUTES.filter(g=>['wotg','adoulin','ahturhgan'].includes(g.id)))
  for(const zone of group.regions.flatMap(r=>r.zones)){
    assert.equal(t[zone].crystals.length,0,'Invented cross-era/overseas shortcut: '+zone);
    assert.equal(t[zone].outpost,null,'Invented conquest outpost: '+zone);
  }
vm.runInNewContext(read('travel/zone-routes.js'),c);
let rendered=0;
for(const group of c.window.CR_WORLD_ROUTES){
  element('#route-expansion').value=group.id;element('#route-expansion').events.change();
  const html=element('#world-route-root').innerHTML;
  const names=[...html.matchAll(/<h3>(.*?)<\/h3>/g)].map(m=>m[1].replaceAll('&#39;',"'"));
  const expected=group.regions.flatMap(region=>region.zones);
  assert.equal(names.length,expected.length,group.name+' lost areas');
  assert.equal((html.match(/class="zone-quick"/g)||[]).length,expected.length,'Missing region/count summary');
  assert.equal((html.match(/class="zone-travel"/g)||[]).length,expected.length,'Missing transport summary');
  const headings=[...html.matchAll(/<summary><strong>(.*?)<\/strong> <span>\d+ areas?<\/span>/g)].map(m=>m[1]);
  assert.equal(new Set(headings).size,headings.length,'Duplicate region groups');
  assert.equal(headings.length,new Set(expected.map(zone=>t[zone].region)).size,'Broad directory labels survived');
  rendered+=names.length;
}
assert.equal(rendered,210);
element('#route-expansion').value='original';element('#route-search').value='zulkheim';element('#route-search').events.input();
assert.ok(element('#world-route-root').innerHTML.includes('Konschtat Highlands'));
assert.ok(!element('#world-route-root').innerHTML.includes('<h3>Upper Jeuno</h3>'));
// A subsequent render after field-guide enrichment keeps region, outpost and crystal labels.
c.window.CR_ZONE_FIELD_GUIDES['Konschtat Highlands']={mobs:[{name:'Test mob'}],npcs:[{name:'Test NPC'}],dbLoaded:true};
element('#route-search').value='Konschtat Highlands';element('#route-search').events.input();
let html=element('#world-route-root').innerHTML;
assert.match(html,/1 NPC.*1 mob\/NM entr.*Zulkheim/);
assert.ok(html.includes('Zulkheim — Valkurm Dunes')&&html.includes('Dem — Konschtat Highlands'));
// Invoke the real delegated map click, then the crystal link inside the map viewer.
element('#world-route-root').events.click({target:{closest:s=>s==='[data-open-map]'?{dataset:{openMap:'Konschtat Highlands'}}:null}});
assert.ok(element('#map-viewer-info').innerHTML.includes('Zulkheim'));
assert.ok(element('#map-viewer-travel').innerHTML.includes('Dem — Konschtat Highlands'));
element('#map-viewer-travel').events.click({target:{closest:()=>({dataset:{openMap:'La Theine Plateau'}})}});
assert.equal(element('#map-viewer-title').textContent,'La Theine Plateau');
assert.ok(element('#map-viewer-travel').innerHTML.includes('Holla — La Theine Plateau'));
assert.ok(element('#map-viewer-travel').innerHTML.includes('blue-crystals.html#holla'));
assert.ok(element('#map-viewer-travel').innerHTML.includes('beside the Shattered Telepoint'));
const page=read('travel/zone-routes.html');
assert.ok(page.indexOf('zone-travel-data.js')<page.indexOf('zone-routes.js?v='));
assert.match(page,/zone-routes\.js\?v=[^" ]+/);
assert.ok(page.includes('grid-template-rows:auto auto auto minmax(0,1fr)'));
// Loading one zone replaces only that card, preserving open sections by label.
const section=(text,open=false)=>({open,querySelector:()=>({textContent:text})});
const oldSection=section('Mobs, levels, detection & drops 1',true),newSections=[section('Route hazards & how to avoid them 2'),section('Mobs, levels, detection & drops 2')];
let firstReplaced=0,otherReplaced=0;
const card={dataset:{zone:'konschtat highlands'},querySelectorAll:()=>[oldSection],replaceWith(){firstReplaced++}};
const untouched={dataset:{zone:'west ronfaure'},replaceWith(){otherReplaced++}};
element('#world-route-root').querySelectorAll=()=>[card,untouched];
document.createElement=()=>({content:{firstElementChild:{querySelectorAll:()=>newSections}}});
c.window.dispatchEvent=()=>{};c.CustomEvent=class{};
const before=element('#world-route-root').innerHTML;
c.window.CR_ATLAS.merge('Konschtat Highlands',{mobs:[{name:'Fresh native mob'}],nms:[],hnms:[],npcs:[]});
assert.equal(firstReplaced,1);assert.equal(otherReplaced,0);assert.equal(element('#world-route-root').innerHTML,before,'Entire directory was rebuilt');
assert.equal(newSections[0].open,false);assert.equal(newSections[1].open,true,'Changed counts/new sections lost open panel');
console.log('PASS: all 210 areas, six expansions, exact region grouping, crystal/outpost coverage, post-load summaries, search and actual map-link callbacks.');
