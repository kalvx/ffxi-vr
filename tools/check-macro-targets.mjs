import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const c={window:{},URL,document:{currentScript:{src:'https://example.test/assets/macro-targets.js'},createElement:()=>({}),head:{append(){}}}};
vm.runInNewContext(read('assets/macro-target-data.js')+'\n'+read('assets/macro-targets.js'),c);
const api=c.window.CRMacroTargets;
const targets=line=>[...api.variants(line)].map(x=>x.target);
assert.deepEqual(targets('/ma "Protect" <t>'),['t','stpc','me']);
assert.deepEqual(targets('/ma "Cure" <stpc>'),['t','stpc','stnpc','bt','me']);
assert.deepEqual(targets('/ma "Fire IV" <t>'),['t','stnpc','bt']);
assert.deepEqual(targets('/ja "Berserk" <me>'),['me']);
assert.deepEqual(targets('/ja "Max Potion" <t>'),['t','stpc','me']);
assert.deepEqual(targets('/ja "Mix: Guard Drink" <t>'),['t','stpc','me']);
assert.deepEqual(targets('/ma "Raise" <t>'),['t','stpc']);
for(const name of ['Starlight','Moonlight','Dagan','Myrkr'])assert.deepEqual(targets(`/ws "${name}" <t>`),['me']);
assert.deepEqual(targets('/ws "Combo" <t>'),['t','stnpc','bt']);
assert.deepEqual(targets('/attack <t>'),['t','stnpc','bt']);
assert.deepEqual(targets('/ra <t>'),['t','stnpc','bt']);
assert.deepEqual(targets('/pet "Fight" <t>'),['t','stnpc','bt']);
assert.deepEqual(targets('/pet "Heel" <me>'),['me']);
assert.deepEqual(targets('/ja "Provoke" <t>'),['t','stnpc','bt']);
assert.deepEqual(targets('/ma "Fire IV" <bt>'),['t','stnpc','bt']);
assert.ok(api.render('/ma "Fire IV" <bt>').includes('data-copy="/ma &quot;Fire IV&quot; &lt;bt&gt;"'));
// Every known player action gets bt exactly when its native target mask includes enemies.
for(const kind of ['spell','ability','weaponskill']){
  const command={spell:'ma',ability:'ja',weaponskill:'ws'}[kind];
  for(const [id,mask] of Object.entries(c.window.CRMacroTargetData[kind])){
    const rows=api.variants(`/${command} "Fixture ${id}" <t>`,{kind,id:Number(id)});
    assert.equal(rows.some(row=>row.target==='bt'),Boolean(mask&4),`${kind} ${id} enemy-target eligibility`);
    const html=api.render(`/${command} "Fixture ${id}" <t>`,{kind,id:Number(id)});
    assert.equal((html.match(/data-copy=/g)||[]).length,1);
  }
}
assert.equal(api.variants('/wait 1').length,1);
assert.equal(api.variants('/equip main "Item Name"').length,1);
const html=api.render('/ma "Protect" <stpc>');
assert.equal((html.match(/role="tab"/g)||[]).length,3);
assert.equal((html.match(/data-copy=/g)||[]).length,1);
assert.ok(html.includes('data-copy="/ma &quot;Protect&quot; &lt;stpc&gt;"'));
// Execute actual binding: selecting a target changes both the visible full line and Copy data.
const code={textContent:''},copy={dataset:{}},note={textContent:'',hidden:true},panel={setAttribute(k,v){this[k]=v;}};
const nodes={'[data-macro-line]':code,'[data-copy]':copy,'[data-macro-note]':note,'[role="tabpanel"]':panel};
const card={querySelector:s=>nodes[s]};
const buttons=api.variants('/ma "Protect" <t>').map((r,i)=>({id:'tab-'+i,dataset:{targetLine:r.line,targetNote:r.note},events:{},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.events[k]=fn;},focus(){this.focused=true;}}));
const tabs={querySelectorAll:()=>buttons,closest:()=>card};
api.bind({querySelectorAll:()=>[tabs]});
buttons[1].events.click();assert.equal(code.textContent,'/ma "Protect" <stpc>');assert.equal(copy.dataset.copy,code.textContent);assert.equal(panel['aria-labelledby'],'tab-1');
buttons[2].events.click();assert.equal(code.textContent,'/ma "Protect" <me>');assert.equal(copy.dataset.copy,code.textContent);
let prevented=false;buttons[2].events.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});assert.ok(prevented&&buttons[0].focused);assert.equal(copy.dataset.copy,'/ma "Protect" <t>');
const enemyButtons=api.variants('/ma "Fire IV" <t>').map((r,i)=>({id:'enemy-'+i,dataset:{targetLine:r.line,targetNote:r.note},events:{},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.events[k]=fn;},focus(){this.focused=true;}}));
api.bind({querySelectorAll:()=>[{querySelectorAll:()=>enemyButtons,closest:()=>card}]});
enemyButtons[2].events.click();assert.equal(code.textContent,'/ma "Fire IV" <bt>');assert.equal(copy.dataset.copy,code.textContent);assert.equal(enemyButtons[2]['aria-selected'],'true');
console.log('PASS: all known action-mask bt eligibility, friendly/self exclusions, one Copy button and actual active battle-target full-line/keyboard switching.');
