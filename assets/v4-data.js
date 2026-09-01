let gameData=null,dossierJob='WAR',dossierView='overview';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds=value=>value?value>=60?`${Math.round(value/60)} min`:`${value} sec`:'—';
function jobRecord(code){return gameData.jobs.find(j=>j.code===code);}
function jobProfile(code){return jobs.find(j=>j.code===code)||{name:jobRecord(code)?.name||code,summary:'Adventuring job.',role:[],abilities:[]};}

function loadReferenceData(){
  referenceData.items=gameData.items.map(x=>[x.name,`${x.kind} · ID ${x.id}`,[x.equip?`Level ${x.equip.level}${x.equip.ilevel?` · iLvl ${x.equip.ilevel}`:''}`:'',x.weapon?`${x.weapon.damage} DMG · ${x.weapon.delay} delay · ${x.weapon.skill}`:'',x.usable?`${x.usable.charges||'Single'} use · ${seconds(x.usable.reuse)} reuse`:'',`Stack ${x.stack}`].filter(Boolean).join(' · '),x.kind]);
  referenceData.spells=gameData.spells.map(x=>[x.name,Object.entries(x.jobs).map(([j,l])=>`${j} ${l}`).join(' · ')||'Special',`${x.element} · ${x.mp} MP · cast ${x.cast} ms · recast ${x.recast} ms${x.aoe?' · Area':''}`,'Spell']);
  referenceData.weaponSkills=gameData.weaponSkills.map(x=>[x.name,x.weapon,`Skill ${x.skill}${x.sc.length?` · ${x.sc.join(' / ')}`:''} · ${x.jobs.join(' · ')||'Special'}`,'Weapon skill']);
  referenceData.jobAbilities=gameData.abilities.map(x=>[x.name,`${x.job}${x.level?` Lv.${x.level}`:''}`,`Recast ${seconds(x.recast)}${x.aoe?' · Area':''}${x.content?` · ${x.content}`:''}`,'Ability']);
  document.querySelector('#database-summary').innerHTML=`<strong>Complete server reference:</strong> ${gameData.meta.items.toLocaleString()} items · ${gameData.meta.spells.toLocaleString()} spells · ${gameData.meta.weaponSkills.toLocaleString()} weapon skills · ${gameData.meta.abilities.toLocaleString()} abilities · ${gameData.meta.recipes.toLocaleString()} recipes.`;
  renderReference();
}

function actionCard(type,name,detail,command){return `<article><span>${esc(type)}</span><strong>${esc(name)}</strong><p>${esc(detail)}</p><code>${esc(command)}</code><button data-copy="${esc(command)}">Copy</button></article>`;}
function infoCard(type,name,detail,extra=''){return `<article class="info-card"><span>${esc(type)}</span><strong>${esc(name)}</strong><p>${esc(detail)}</p>${extra?`<small>${esc(extra)}</small>`:''}</article>`;}
function bindCopy(root=document){root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.dataset.copy);const old=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=old,900);});}

function renderDossier(){
  const jr=jobRecord(dossierJob),profile=jobProfile(dossierJob),abilities=gameData.abilities.filter(x=>x.job===dossierJob),spells=gameData.spells.filter(x=>x.jobs[dossierJob]),ws=gameData.weaponSkills.filter(x=>x.jobs.includes(dossierJob)),skills=gameData.skillRanks.filter(x=>x.jobs[dossierJob]),mask=1<<(jr.id-1),equipment=gameData.items.filter(x=>x.equip&&(x.equip.jobs&mask));
  const heading=`<header><span class="job-seal">${jr.code}</span><div><p class="eyebrow">Server job dossier</p><h3>${esc(jr.name)}</h3><p>${esc(profile.summary)}</p></div></header>`;
  let body='';
  if(dossierView==='overview') body=`<div class="dossier-stats"><article><b>${abilities.length}</b><span>job abilities</span></article><article><b>${spells.length}</b><span>learnable spells</span></article><article><b>${ws.length}</b><span>weapon skills</span></article><article><b>${equipment.length}</b><span>equippable records</span></article></div><div class="dossier-columns"><div><h4>Field role</h4><p>${esc(profile.role.join(' · ')||'Flexible')}</p><h4>Signature actions</h4><p>${esc(profile.abilities.join(' · '))}</p></div><div><h4>Highest weapon ratings</h4>${skills.sort((a,b)=>a.jobs[dossierJob]-b.jobs[dossierJob]).slice(0,10).map(x=>`<p><b>${esc(x.name)}</b><span>Rank ${x.jobs[dossierJob]}</span></p>`).join('')}</div></div>`;
  if(dossierView==='abilities') body=`<div class="dossier-list">${abilities.sort((a,b)=>a.level-b.level).map(x=>infoCard('Job ability',x.name,`Level ${x.level}`,`Recast ${seconds(x.recast)}${x.aoe?' · Area effect':''}${x.content?` · ${x.content}`:''}`)).join('')}</div>`;
  if(dossierView==='spells') body=`<div class="dossier-list">${spells.sort((a,b)=>a.jobs[dossierJob]-b.jobs[dossierJob]).map(x=>infoCard(`${x.element} spell`,x.name,`Level ${x.jobs[dossierJob]} · ${x.mp} MP`,`Cast ${x.cast} ms · recast ${x.recast} ms${x.aoe?' · Area effect':''}`)).join('')||'<p class="empty">This job has no spells in the server table.</p>'}</div>`;
  if(dossierView==='weaponSkills') body=`<div class="dossier-list">${ws.sort((a,b)=>a.skill-b.skill).map(x=>infoCard(x.weapon,x.name,`Required skill ${x.skill}`,x.sc.length?`Skillchain: ${x.sc.join(' / ')}`:'No listed skillchain property')).join('')}</div>`;
  if(dossierView==='equipment') body=`<div class="dossier-list equipment-list">${equipment.sort((a,b)=>(b.equip.level-a.equip.level)||a.name.localeCompare(b.name)).slice(0,240).map(x=>infoCard(x.kind,x.name,`Level ${x.equip.level}${x.equip.ilevel?` · item level ${x.equip.ilevel}`:''}`,x.weapon?`${x.weapon.damage} damage · ${x.weapon.delay} delay · ${x.weapon.skill}`:`Server item ID ${x.id}`)).join('')}</div><p class="result-note">Showing the 240 highest-level matching equipment records. Use the complete Item reference for a specific name or level.</p>`;
  if(dossierView==='skills') body=`<div class="skill-rank-table"><div><b>Skill</b><b>Rank</b></div>${skills.sort((a,b)=>a.jobs[dossierJob]-b.jobs[dossierJob]).map(x=>`<div><span>${esc(x.name)}</span><strong>${x.jobs[dossierJob]}</strong></div>`).join('')}</div>`;
  const root=document.querySelector('#job-dossier');root.innerHTML=heading+body;
}

function renderMacroLibrary(){
  const code=document.querySelector('#macro-job').value,kind=document.querySelector('#macro-type').value,q=document.querySelector('#macro-search').value.trim().toLowerCase(),actions=[];
  if(kind==='all'||kind==='ability')gameData.abilities.filter(x=>code==='ALL'||x.job===code).forEach(x=>actions.push({type:'Ability',name:x.name,detail:`${x.job} Lv.${x.level}`,command:`/ja "${x.name}" <${x.target===1?'me':'t'}>`}));
  if(kind==='all'||kind==='spell')gameData.spells.filter(x=>code==='ALL'||x.jobs[code]).forEach(x=>actions.push({type:'Spell',name:x.name,detail:code==='ALL'?Object.entries(x.jobs).map(([j,l])=>`${j} ${l}`).join(' · '):`${code} Lv.${x.jobs[code]}`,command:`/ma "${x.name}" <t>`}));
  if(kind==='all'||kind==='weaponskill')gameData.weaponSkills.filter(x=>code==='ALL'||x.jobs.includes(code)).forEach(x=>actions.push({type:'Weapon skill',name:x.name,detail:`${x.weapon} · skill ${x.skill}`,command:`/ws "${x.name}" <t>`}));
  const matches=actions.filter(x=>`${x.type} ${x.name} ${x.detail} ${x.command}`.toLowerCase().includes(q)),visible=matches.slice(0,180),root=document.querySelector('#macro-results');root.innerHTML=visible.map(x=>actionCard(x.type,x.name,x.detail,x.command)).join('')||'<p class="empty">No matching commands.</p>';if(matches.length>visible.length)root.insertAdjacentHTML('beforeend',`<p class="result-note">Showing ${visible.length} of ${matches.length}. Refine the search to reach the rest.</p>`);bindCopy(root);
}

function renderDatabaseCrafts(){
  const skill=Number(document.querySelector('#craft-skill').value)||0,simple=document.querySelector('#craft-simple').checked,craft=craftRoutes[activeCraft];
  document.querySelector('#craft-tabs').innerHTML=Object.keys(craftRoutes).map(name=>`<button class="${name===activeCraft?'active':''}" data-db-craft="${name}">${name}</button>`).join('');
  let rows=gameData.recipes.filter(r=>!r.desynth&&r.skills[activeCraft]!=null).sort((a,b)=>a.skills[activeCraft]-b.skills[activeCraft]);const total=rows.length;rows=rows.filter(r=>r.skills[activeCraft]>=Math.max(1,skill-4));if(simple)rows=rows.filter(r=>r.ingredients.reduce((n,x)=>n+x.qty,0)<=2||r.skills[activeCraft]<=skill+10);rows=rows.slice(0,160);
  document.querySelector('#craft-overview').innerHTML=`<article><small>Guild</small><strong>${craft.guild}</strong><span>${craft.city}</span></article><article><small>Complete recipes</small><strong>${total.toLocaleString()}</strong><span>Matching server records</span></article><article><small>Current rank</small><strong>${[...ranks].reverse().find(r=>skill>=r[1])[0]}</strong><span>Skill ${skill.toFixed(1)}</span></article>`;
  document.querySelector('#recipe-table').innerHTML=`<div class="recipe-row recipe-head"><span>Cap</span><span>Result</span><span>Crystal</span><span>Ingredients</span><span>Route note</span></div>`+rows.map(r=>{const cap=r.skills[activeCraft],count=r.ingredients.reduce((n,x)=>n+x.qty,0);return `<div class="recipe-row ${cap>=skill&&cap<=skill+7?'recommended':''}"><b>${cap}</b><strong>${esc(r.result.name)} ×${r.result.qty}</strong><span>${esc(r.crystal.name)}</span><span>${r.ingredients.map(x=>`${esc(x.name)}${x.qty>1?` ×${x.qty}`:''}`).join(' · ')}</span><em>${count<=2?'Low item count':cap<=skill+7?'Good skill-up range':'Available route'}</em></div>`}).join('');
  document.querySelectorAll('[data-db-craft]').forEach(b=>b.onclick=()=>{activeCraft=b.dataset.dbCraft;renderDatabaseCrafts();});
}

async function initializeGameData(){
  const response=await fetch('assets/data/game-data.json');if(!response.ok)throw new Error(`Database ${response.status}`);gameData=await response.json();window.gameData=gameData;loadReferenceData();
  const options=gameData.jobs.map(j=>`<option value="${j.code}">${j.code} · ${esc(j.name)}</option>`).join('');document.querySelector('#dossier-job').innerHTML=options;document.querySelector('#macro-job').innerHTML='<option value="ALL">All jobs</option>'+options;
  document.querySelector('#dossier-job').onchange=e=>{dossierJob=e.target.value;renderDossier();};document.querySelectorAll('#dossier-tabs [data-view]').forEach(b=>b.onclick=()=>{dossierView=b.dataset.view;document.querySelectorAll('#dossier-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderDossier();});
  ['macro-search','macro-job','macro-type'].forEach(id=>document.querySelector('#'+id).addEventListener('input',renderMacroLibrary));
  document.querySelector('#craft-skill').oninput=renderDatabaseCrafts;document.querySelector('#craft-simple').oninput=renderDatabaseCrafts;
  renderDossier();renderMacroLibrary();renderDatabaseCrafts();
}
document.addEventListener('DOMContentLoaded',()=>initializeGameData().catch(error=>{document.querySelector('#database-summary').innerHTML=`<strong>Reference unavailable:</strong> ${esc(error.message)}`;}));
