const classify=key=>key.endsWith('_uc')?'unity':/_ii$|_s$|^d_/.test(key)?'alternate':'standard';
const shortBehavior=value=>{const parts=value.split(';').map(x=>x.trim()).filter(Boolean);return parts.slice(0,3).join('; ')+(parts.length>3?'…':'')};
const trustEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trustSummonCommand=t=>`/ma "${TRUST_MACRO_NAMES[t.id]||t.name}" <me>`;
function bindTrustCopy(root){
  root.querySelectorAll('[data-trust-copy]').forEach(button=>button.onclick=async()=>{
    const label=button.textContent;
    try{await navigator.clipboard.writeText(button.dataset.trustCopy);button.textContent='Copied';}
    catch{button.textContent='Copy failed';}
    setTimeout(()=>button.textContent=label,1200);
  });
}
function renderTrustMacros(){
  const root=document.querySelector('#trust-macro-grid');if(!root)return;
  const q=document.querySelector('#trust-macro-search').value.trim().toLowerCase();
  const rows=TRUST_DETAILS.filter(t=>`${t.name} ${trustSummonCommand(t)} ${t.job}`.toLowerCase().includes(q));
  document.querySelector('#trust-macro-count').textContent=`${rows.length} of ${TRUST_DETAILS.length} summon macros`;
  root.innerHTML=rows.map(t=>`<article class="trust-card"><small>Trust summon · All jobs</small><h3>${trustEscape(t.name)}</h3><code>${trustEscape(trustSummonCommand(t))}</code><button type="button" data-trust-copy="${trustEscape(trustSummonCommand(t))}">Copy macro</button></article>`).join('')||'<p>No matching Trust macro.</p>';
  bindTrustCopy(root);
}
function render(){
  const q=document.querySelector('#trust-search').value.trim().toLowerCase(),kind=document.querySelector('#trust-kind').value;
  const rows=TRUST_DETAILS.filter(t=>{t.kind=classify(t.key);return(kind==='all'||t.kind===kind)&&`${t.name} ${t.job} ${t.acquisition} ${t.weaponSkills}`.toLowerCase().includes(q)});
  document.querySelector('#trust-count').textContent=`${rows.length} of ${TRUST_DETAILS.length}`;
  const root=document.querySelector('#trust-grid');
  root.innerHTML=rows.map(t=>`<article class="trust-card"><small>${t.kind==='unity'?'Unity Concord':t.kind==='alternate'?'Alternate version':'Trust'}</small><h3>${t.name}</h3><b class="trust-job">${t.job||'Role not listed'}</b><code>${trustEscape(trustSummonCommand(t))}</code><button type="button" data-trust-copy="${trustEscape(trustSummonCommand(t))}">Copy summon macro</button><details><summary>How to obtain</summary><p>${t.acquisition}</p></details><details><summary>Weapon skills & behavior</summary><p><strong>Weapon skills:</strong> ${t.weaponSkills||'None listed'}</p><p>${shortBehavior(t.behavior)}</p></details></article>`).join('')||'<p>No matching Trust.</p>';
  bindTrustCopy(root);
}
document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#trust-search').addEventListener('input',render);document.querySelector('#trust-kind').addEventListener('change',render);document.querySelector('#trust-macro-search')?.addEventListener('input',renderTrustMacros);render();renderTrustMacros()});
