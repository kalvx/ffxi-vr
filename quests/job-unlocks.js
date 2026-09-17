(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards=document.querySelector('#job-cards');
  if(cards&&window.JOB_UNLOCKS!==null){cards.innerHTML=Object.entries(JOB_UNLOCKS).map(([id,j])=>`<article class="trust-card"><small>${esc(j.exp)}</small><h3>${esc(j.name)}</h3><p><strong>${esc(j.quest)}</strong><br>${esc(j.start)}</p><a href="job-unlock.html?job=${encodeURIComponent(id)}">Open full ${esc(j.name)} unlock guide →</a></article>`).join('');}
  const root=document.querySelector('#job-guide');
  if(!root)return;
  const id=new URLSearchParams(location.search).get('job');
  const j=JOB_UNLOCKS[id];
  if(!j){root.innerHTML='<section class="wiki-section"><h2>Guide not found</h2><p>Return to the <a href="job-unlocks.html">Advanced Job Unlocks</a> directory.</p></section>';return;}
  document.title=`${j.name} Unlock | Current Reality`;
  root.innerHTML=`<header class="wiki-title"><p class="eyebrow">Quests → Advanced Jobs • ${esc(j.exp)}</p><h1>${esc(j.name)} — ${esc(j.quest)}</h1><p>Complete Current Reality walkthrough for unlocking ${esc(j.name)}.</p></header><section class="wiki-section"><h2>Before you go</h2><table class="fact-table"><tbody><tr><th>Unlock quest</th><td>${esc(j.quest)}</td></tr><tr><th>Starting NPC</th><td>${esc(j.start)}</td></tr><tr><th>Prerequisites</th><td>${esc(j.req)}</td></tr><tr><th>Required items</th><td>${esc(j.items||'Items are identified at the exact step where they are used.')}</td></tr><tr><th>Reward</th><td>${esc(j.reward)}</td></tr></tbody></table></section><section class="wiki-section"><h2>Step-by-step unlock route</h2><ol class="guide-steps">${j.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section><p class="notice"><strong>Important:</strong> ${esc(j.warn)}</p><section class="wiki-section"><h2>Reference and server note</h2><p>This guide is rewritten in the Current Reality style from retail quest documentation and checked for NPCs, locations, items, and completion flow. Private-server behavior can differ by server revision. <a href="${j.src}" target="_blank" rel="noopener">Open the BG-Wiki reference page</a>.</p></section>`;
})();
