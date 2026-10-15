import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('assets/data/game-data.json'));
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',querySelectorAll:()=>[],insertAdjacentHTML(_,s){this.innerHTML+=s;}});return elements.get(id);};
const document={currentScript:{src:'https://example.test/assets/v4-data.js'},createElement:()=>({}),head:{append(){}},addEventListener(){},querySelector:element};
const c={document,URL,URLSearchParams,location:{search:'',pathname:'/jobs/index.html',href:'https://example.test/jobs/index.html'},window:{},jobs:[]};
vm.runInNewContext(read('assets/v4-data.js')+`;globalThis.api={setData:d=>gameData=d,setJob:j=>dossierJob=j,setView:v=>dossierView=v,isTrustSpell,renderDossier,renderMacroLibrary,esc};`,c);
c.api.setData(data);
const trusts=data.spells.filter(c.api.isTrustSpell);
assert.equal(trusts.length,120);
element('#macro-type').value='spell';element('#macro-search').value='';
for(const job of data.jobs){
  element('#macro-job').value=job.code;c.api.renderMacroLibrary();
  c.api.setJob(job.code);c.api.setView('spells');c.api.renderDossier();
  for(const trust of trusts){
    assert.ok(!element('#macro-results').innerHTML.includes(`<strong>${c.api.esc(trust.name)}</strong>`),`${job.code} macro ${trust.name}`);
    assert.ok(!element('#job-dossier').innerHTML.includes(`<strong>${c.api.esc(trust.name)}</strong>`),`${job.code} dossier ${trust.name}`);
  }
}
element('#macro-job').value='ALL';element('#macro-search').value='Shantotto';c.api.renderMacroLibrary();assert.ok(!element('#macro-results').innerHTML.includes('/ma'));
c.api.setJob('ALC');c.api.setView('spells');c.api.renderDossier();
const alc=element('#job-dossier').innerHTML;
for(const name of ['Virus','Curse','Float','Mana Shield','Mix: Impact','Mix: Meteor','Mix: Meteor II'])assert.ok(alc.includes(`<strong>${name}</strong>`));
assert.equal((alc.match(/class="info-card"/g)||[]).length,7);
const t={document,setTimeout(){},navigator:{clipboard:{writeText:async()=>{}}}};
vm.runInNewContext(read('trusts/trust-data.js')+'\n'+read('trusts/macro-data.js')+'\n'+read('trusts/trusts.js')+';globalThis.api={details:TRUST_DETAILS,names:TRUST_MACRO_NAMES,render,renderTrustMacros,trustSummonCommand};',t);
assert.equal(t.api.details.length,120);assert.equal(Object.keys(t.api.names).length,120);
assert.deepEqual([...t.api.details.map(x=>x.id)].sort((a,b)=>a-b),trusts.map(x=>x.id).sort((a,b)=>a-b));
element('#trust-macro-search').value='';t.api.renderTrustMacros();
assert.equal((element('#trust-macro-grid').innerHTML.match(/data-trust-copy=/g)||[]).length,120);
for(const name of ['D. Shantotto','I. Shield (UC)',"Selh'teus",'Excenmille [S]','AAHM','Shantotto II'])assert.ok(Object.values(t.api.names).includes(name));
for(const trust of t.api.details)assert.equal(t.api.trustSummonCommand(trust),`/ma "${t.api.names[trust.id]}" <me>`);
element('#trust-macro-search').value='Shantotto';t.api.renderTrustMacros();assert.equal((element('#trust-macro-grid').innerHTML.match(/data-trust-copy=/g)||[]).length,3);
element('#trust-search').value='';element('#trust-kind').value='all';t.api.render();
assert.equal((element('#trust-grid').innerHTML.match(/class="trust-card"/g)||[]).length,120);
for(const trust of t.api.details){assert.ok(trust.acquisition);assert.ok(element('#trust-grid').innerHTML.includes(trust.name));}
assert.ok(read('macros/index.html').includes('../trusts/index.html#summoning-macros'));
assert.ok(read('trusts/index.html').includes('id="summoning-macros"'));
console.log('PASS: all 22 job lists exclude Trusts; all seven ALC spells remain; 120 native-name self-targeted Trust macros, search and full roster preserved.');
