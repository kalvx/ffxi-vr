const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),clock=require(path.join(root,'assets/vana-clock-core.js'));
let checks=0;
for(let n=0;n<10000;n++){
 const ms=Date.UTC(2024,0,1)+n*123456789,s=clock.snapshot(ms);
 const old=Math.floor(((ms/1000)-1009810800)/60*25)+886*518400;
 assert.equal(s.minutes,old);assert.equal(s.dayIndex,Math.floor(old%11520/1440));assert.ok(s.untilNextDay>0&&s.untilNextDay<=3456);checks+=3;
}
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'crafting/compass-data.js'),'utf8'),ctx);
const data=ctx.window.CurrentRealityCraftingCompass;
assert.deepEqual(Array.from(data.elements,e=>[e.safe,e.risky]),[[5,4],[0,5],[1,0],[2,1],[3,2],[4,3],[7,6],[6,7]]);checks++;
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{value:'0',checked:true,dataset:{},style:{},classList:{toggle(){}},setAttribute(k,v){this[k]=v},addEventListener(k,v){this[k]=v}});return elements.get(id);}
const buttons=['safe','risk'].map(mode=>({...element(mode),dataset:{mode}}));let day=0,render;
ctx.document={querySelector:s=>element(s.slice(1)),getElementById:element,querySelectorAll:s=>s==='.direction-mode'?buttons:[]};
ctx.window.CurrentRealityVanaClock={snapshot:()=>({...clock.snapshot(Date.UTC(2026,9,24)),dayIndex:day,day:clock.days[day]})};
ctx.setInterval=f=>{render=f};vm.runInNewContext(fs.readFileSync(path.join(root,'crafting/compass.js'),'utf8'),ctx);
for(day=0;day<8;day++){
 element('compass-follow').checked=true;render();assert.equal(+element('compass-crystal').value,data.weekday_elements[day]);checks++;
 for(let crystal=0;crystal<8;crystal++)for(let weather=0;weather<20;weather++)for(let mode=0;mode<2;mode++){
  element('compass-crystal').value=String(crystal);element('compass-crystal').change();element('compass-weather').value=String(weather);buttons[mode].click();
  const d=data.weekday_elements[day]===crystal,w=weather>=4&&data.weather_elements[weather]===crystal?(weather%2?2:1):0;
  const points=(mode?-5:5)+(d?2:0)+(w===2?3:w===1?2:0),multiplier=(mode?1.25:1)*(d?1.1:1)*(w===2?1.15:w===1?1.1:1);
  assert.equal(element('success-adjustment').textContent,`${points>=0?'+':''}${points} percentage points`);
  assert.equal(element('chance-multiplier').textContent,`×${Number(multiplier.toFixed(5))}`);
  assert.equal(element('safe-direction').textContent,data.directions[data.elements[crystal].safe]);
  assert.equal(element('risk-direction').textContent,data.directions[data.elements[crystal].risky]);checks+=4;
 }
}
console.log(`PASS: ${checks} clock and actual compass interaction/math checks.`);
