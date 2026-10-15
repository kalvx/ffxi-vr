import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('assets/data/game-data.json'));
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',addEventListener(){},querySelectorAll:()=>[],insertAdjacentHTML(_,s){this.innerHTML+=s;}});return elements.get(id);};
let clipboard='';
const document={currentScript:{src:'https://example.test/assets/v4-data.js?v=20261014-bt1'},createElement:()=>({}),head:{append(){}},addEventListener(){},querySelector:element,querySelectorAll:()=>[]};
const context={document,URL,URLSearchParams,location:{search:'',pathname:'/macros/index.html',href:'https://example.test/macros/index.html'},window:{},navigator:{clipboard:{writeText:async text=>{clipboard=text;}}},setTimeout(){}};
vm.runInNewContext(read('assets/macro-target-data.js')+'\n'+read('assets/macro-targets.js'),context);
vm.runInNewContext(read('assets/v4-data.js')+';globalThis.library={setData:data=>gameData=data,renderMacroLibrary,bindCopy};',context);
context.library.setData(data);
const metadata=context.window.CRMacroTargetData;
let cases=0;
for(const job of ['ALL',...data.jobs.map(row=>row.code)]){
  element('#macro-job').value=job;
  for(const kind of ['spell','ability','weaponskill']){
    element('#macro-type').value=kind;element('#macro-search').value='<bt>';
    const records=kind==='spell'?data.spells.filter(row=>row.group!==8&&(job==='ALL'||row.jobs[job])):
      kind==='ability'?data.abilities.filter(row=>job==='ALL'||row.job===job):
      data.weaponSkills.filter(row=>job==='ALL'||row.jobs.includes(job));
    const expected=Math.min(180,records.filter(row=>metadata[kind][row.id]&4).length);
    context.library.renderMacroLibrary();
    const html=element('#macro-results').innerHTML;
    assert.equal((html.match(/>&lt;bt&gt;<\/button>/g)||[]).length,expected,`${job} ${kind} bt search/tab coverage`);
    assert.equal((html.match(/data-copy=/g)||[]).length,expected,`${job} ${kind} single Copy per result`);
    cases++;
  }
}
vm.runInNewContext(read('assets/site.js')+';globalThis.starters={jobs,select:job=>selected=job,renderDetail};',context);
for(const job of context.starters.jobs){
  context.starters.select(job.code);context.starters.renderDetail();
  const expected=job.macros.filter(([,line])=>context.window.CRMacroTargets.variants(line).some(row=>row.target==='bt')).length;
  assert.equal((element('#job-detail').innerHTML.match(/>&lt;bt&gt;<\/button>/g)||[]).length,expected,`${job.code} starter macros`);
}
const code={textContent:''},copy={dataset:{},textContent:'Copy macro'},note={textContent:'',hidden:true},panel={setAttribute(){}};
const nodes={'[data-macro-line]':code,'[data-copy]':copy,'[data-macro-note]':note,'[role="tabpanel"]':panel};
const card={querySelector:s=>nodes[s]};
const buttons=context.window.CRMacroTargets.variants('/ma "Fire IV" <t>').map((row,i)=>({id:`tab-${i}`,dataset:{targetLine:row.line,targetNote:row.note},events:{},setAttribute(){},addEventListener(event,callback){this.events[event]=callback;},focus(){}}));
context.window.CRMacroTargets.bind({querySelectorAll:()=>[{querySelectorAll:()=>buttons,closest:()=>card}]});
buttons.find(button=>button.dataset.targetLine.endsWith('<bt>')).events.click();
context.library.bindCopy({querySelectorAll:()=>[copy]});await copy.onclick();
assert.equal(clipboard,'/ma "Fire IV" <bt>');assert.equal(code.textContent,clipboard);
for(const key of ['macros/index.html','tools/library-source.html'])assert.ok(read(key).includes('&lt;bt&gt;</code><span>battle target'));
console.log(`PASS: ${cases} job/type library searches, all 22 starter job sets, enemy-only bt tabs, one Copy per card and actual active-tab clipboard handler.`);
